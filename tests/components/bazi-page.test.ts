// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import BaziPage from '~/pages/tools/bazi.vue'
import BaziStatusBanner from '~/components/bazi/BaziStatusBanner.vue'
import AuthDialog from '~/components/auth/AuthDialog.vue'
import { BAZI_NOT_OUTPUT } from '~/constants/bazi-rules'
import { useAuth as realUseAuth } from '~/composables/useAuth'

/**
 * 八字页面组件：六段 DOM 顺序、状态文案、候选等价文字、术语六问、Ⅴ 段清单、
 * 措辞红线，以及 Ⅵ 段的保存与历史交互。
 *
 * 期望值来源：治理规范 §4.1–4.6（六段顺序）、§7.3/§7.4（状态与 stale）、§19.2（弹层焦点）、
 * 契约 §22.1（候选不得只用颜色区分）、契约 §17（六问）、来源规范 §7.3–§7.5（显式保存）。
 * 具体干支值由黄金样例断言，此处只断言结构与文案。
 */

let wrapper: VueWrapper | undefined
/** 模拟 Nuxt 的 useState 容器：按 key 稳定持有，供真实 useAuth 在测试中工作。 */
const stateStore: Record<string, unknown> = {}
const fetchMock = vi.fn()

function setAuth(status: 'restoring' | 'guest' | 'authenticated', accountId = 12) {
  stateStore['auth:status'] = status
  stateStore['auth:account'] =
    status === 'authenticated' ? { id: accountId, nickname: '验收账号' } : null
  stateStore['auth:restore-error'] = null
}

beforeEach(() => {
  for (const key of Object.keys(stateStore)) delete stateStore[key]
  setAuth('guest')
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (url: string, options?: { method?: string }) => {
    const method = options?.method ?? 'GET'
    if (url === '/api/self-profile/summary') {
      return {
        summary: {
          exists: false,
          profileId: null,
          version: null,
          hasBirthDate: false,
          canImport: false,
        },
        historyWithBirthInputCount: 0,
      }
    }
    if (url === '/api/result-history' && method === 'GET') return { items: [] }
    if (url === '/api/result-history' && method === 'POST') {
      // 服务端回显同一次生成的 resultId（幂等键），页面据此判断「已保存」。
      const body = (options as { body?: { resultId?: string } })?.body
      return {
        recordId: '11111111-1111-4111-8111-111111111111',
        resultId: body?.resultId ?? 'rid-1',
        savedAt: '2026-09-14T10:00:00.000Z',
        created: true,
      }
    }
    throw new Error(`unexpected request: ${method} ${url}`)
  })
  vi.stubGlobal('useSeoMeta', vi.fn())
  vi.stubGlobal('$fetch', fetchMock)
  // 页面里的 useAuth 走 Nuxt 自动导入；测试中指向真实实现（依赖上面的 useState 容器），
  // 与 useSelfProfile / useResultHistory 内部的显式导入共享同一份认证状态。
  vi.stubGlobal('useAuth', realUseAuth)
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!(key in stateStore)) stateStore[key] = init()
    return {
      get value() {
        return stateStore[key]
      },
      set value(next: unknown) {
        stateStore[key] = next
      },
    }
  })
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

async function openPage() {
  wrapper = mount(BaziPage, { global: { stubs: { NuxtLink: true, teleport: true } } })
  await flushPromises()
  return wrapper
}

/** 填表并生成：默认日期取跨「节」当日（2000-08-07 立秋），用于候选路径。 */
async function generate(page: VueWrapper, year: string, month: string, day: string) {
  const selects = page.findAll('select')
  await selects[0]!.setValue(year)
  await selects[1]!.setValue(month)
  await selects[2]!.setValue(day)
  await page.get('[data-bazi-age]').setValue(true)
  const button = page.findAll('button').find(item => item.text().includes('生成三柱结果'))
  await button!.trigger('click')
  await flushPromises()
}

describe('八字页面六段结构', () => {
  it('DOM 阅读顺序即治理规范六段顺序', async () => {
    const page = await openPage()
    const order = page
      .findAll('[data-bazi-section]')
      .map(section => section.attributes('data-bazi-section'))
    expect(order).toEqual(['guide', 'input', 'summary', 'detail', 'scope', 'actions'])
  })

  it('页面只有一个 h1（由 PageHero 提供）', async () => {
    const page = await openPage()
    expect(page.findAll('h1')).toHaveLength(1)
  })

  it('Ⅰ 段列出定位、能回答与不能回答的闭集，并标注内部验证状态', async () => {
    const page = await openPage()
    const guide = page.get('[data-bazi-section="guide"]')
    expect(guide.text()).toContain('本页能回答')
    expect(guide.text()).toContain('本页不能回答')
    for (const item of BAZI_NOT_OUTPUT) {
      expect(guide.text()).toContain(item)
    }
    expect(page.get('[data-bazi-internal]').text()).toContain('内部验证')
  })

  it('Ⅱ 段无任何默认值：三个日期控件均为空、闰月控件未出现、年龄未勾选', async () => {
    const page = await openPage()
    const selects = page.findAll('select')
    expect(selects).toHaveLength(3)
    for (const select of selects) {
      expect((select.element as HTMLSelectElement).value).toBe('')
    }
    // 默认公历：不出现闰月选择。
    expect(page.text()).not.toContain('该月是闰月吗')
    expect((page.get('[data-bazi-age]').element as HTMLInputElement).checked).toBe(false)
  })

  it('切到农历后必须显式选择普通月/闰月，未选时不生成结果', async () => {
    const page = await openPage()
    await page.get('[data-bazi-calendar="lunar"] input').setValue()
    await flushPromises()
    expect(page.text()).toContain('该月是闰月吗')
    await generate(page, '2000', '7', '8')
    // 未选闰月状态：生成入口禁用并写明原因，且不产生任何结果。
    const input = page.get('[data-bazi-section="input"]')
    expect(input.text()).toContain('未选择时不会计算')
    expect(input.text()).toContain('农历需明确普通月或闰月')
    const button = page.findAll('button').find(item => item.text().includes('生成三柱结果'))
    expect((button!.element as HTMLButtonElement).disabled).toBe(true)
    expect(page.find('[data-bazi-pillar]').exists()).toBe(false)
    expect(page.get('[data-bazi-section="summary"]').text()).not.toContain('已生成日期级结果')
  })
})

describe('八字结果状态与内容', () => {
  it('跨「节」当日：状态说明跨界 + 恰好两个完整情形 + 每项带文字原因', async () => {
    const page = await openPage()
    await generate(page, '2000', '8', '7')

    const summary = page.get('[data-bazi-section="summary"]')
    expect(summary.text()).toContain('该日期跨')
    expect(summary.text()).toContain('立秋')

    const scenarios = page.findAll('[data-bazi-scenario]')
    expect(scenarios).toHaveLength(2)
    expect(scenarios.map(item => item.attributes('data-bazi-scenario'))).toEqual(['pre', 'post'])
    for (const scenario of scenarios) {
      // 等价文字：每个情形都有原因说明与「边界之前/之后」的文字标签，不只靠颜色。
      expect(scenario.get('[data-bazi-scenario-reason]').text().length).toBeGreaterThan(0)
      expect(scenario.text()).toMatch(/边界(之前|之后)/)
    }
    // 候选情形下日柱仍唯一可靠，所以只渲染日柱卡片。
    expect(page.findAll('[data-bazi-pillar]')).toHaveLength(1)
    expect(page.get('[data-bazi-day-master]').text()).toContain('日干')
  })

  it('普通日期：三柱卡片齐备，日柱标注日干，日期对照区分填写与换算', async () => {
    const page = await openPage()
    await generate(page, '2000', '8', '15')

    const summary = page.get('[data-bazi-section="summary"]')
    expect(summary.text()).toContain('已生成日期级结果')
    expect(summary.text()).toContain('共四柱，缺时柱')
    expect(page.findAll('[data-bazi-pillar]')).toHaveLength(3)

    const comparison = page.get('[data-bazi-date-comparison]')
    expect(comparison.get('[data-bazi-original]').text()).toContain('公历 2000-08-15')
    expect(comparison.get('[data-bazi-solar]').text()).toContain('2000-08-15')
    expect(comparison.get('[data-bazi-lunar]').text()).toContain('普通月')
    expect(comparison.get('[data-bazi-conversion-version]').text().length).toBeGreaterThan(0)
  })

  it('修改输入后：旧结果保留并显示「输入已修改，结果尚未更新」，不自动重算', async () => {
    const page = await openPage()
    await generate(page, '2000', '8', '15')
    const before = page.get('[data-bazi-section="summary"]').text()

    await page.findAll('select')[2]!.setValue('16')
    await flushPromises()
    const summary = page.get('[data-bazi-section="summary"]')
    expect(summary.text()).toContain('输入已修改，结果尚未更新')
    expect(summary.text()).toContain('2000-08-15')
    // 结果仍在页面上（保留旧结果），且没有被自动重算成 16 日。
    expect(page.findAll('[data-bazi-pillar]')).toHaveLength(3)
    expect(page.get('[data-bazi-date-comparison]').text()).toContain('2000-08-15')
    expect(before).not.toBe(summary.text())
  })

  it('术语六问齐备，且每问给出「不代表什么」与来源', async () => {
    const page = await openPage()
    const guide = page.get('[data-bazi-reading-guide]')
    for (const question of [
      '干支是什么',
      '年柱是怎么定的',
      '月柱为什么按「节」切',
      '日柱与「日干」是什么',
      '为什么有时会同时给出两种年柱、月柱？',
      '没有时柱，会少掉什么',
    ]) {
      expect(guide.text()).toContain(question)
    }
    expect(guide.text()).toContain('不代表什么')
    expect(guide.text()).toContain('来源')
    // 主标签用「日干」，并说明亦称「日主」。
    expect(guide.text()).toContain('亦称「日主」')
  })

  it('Ⅴ 段逐条列出限制说明、未输出清单与版本', async () => {
    const page = await openPage()
    const scope = page.get('[data-bazi-evidence-scope]')
    expect(scope.text()).toContain('限制说明')
    expect(scope.text()).toContain('1 秒级精度尚未核验')
    expect(scope.text()).toContain('原刻影印核对尚未完成')
    expect(scope.text()).toContain('1901-01-01')
    for (const item of BAZI_NOT_OUTPUT) {
      expect(scope.get('[data-bazi-not-output]').text()).toContain(item)
    }
    expect(scope.text()).toContain('2026-09-14-bazi-date-v1')
    expect(scope.text()).toContain('国家标准')
  })

  it('正文段不出现任何结论型内容（大运/流年/神煞/喜用神/评分/吉凶）', async () => {
    const page = await openPage()
    await generate(page, '2000', '8', '15')
    const forbidden = [
      '大运',
      '流年',
      '流月',
      '神煞',
      '喜用神',
      '忌神',
      '评分',
      '吉凶',
      '胎元',
      '命宫',
      '身宫',
    ]
    for (const section of ['input', 'summary', 'detail']) {
      const text = page.get(`[data-bazi-section="${section}"]`).text()
      for (const word of forbidden) {
        expect(text, `${section} 段不应出现「${word}」`).not.toContain(word)
      }
    }
  })
})

describe('八字保存与历史（Ⅵ 段）', () => {
  it('未生成结果时保存入口禁用，并说明先生成再保存', async () => {
    setAuth('authenticated')
    const page = await openPage()
    const button = page.get('[data-bazi-save-button]')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    expect(page.get('[data-bazi-save-hint]').text()).toContain('先生成结果')
    expect(page.get('[data-bazi-section="actions"]').text()).toContain('不提供导出')
  })

  it('游客点击保存先做页内认证；认证成功只进入保存摘要，不自动保存', async () => {
    setAuth('guest')
    const page = await openPage()
    await generate(page, '2000', '8', '15')

    const saveButton = page.get('[data-bazi-save-button]')
    expect((saveButton.element as HTMLButtonElement).disabled).toBe(false)
    await saveButton.trigger('click')
    await flushPromises()
    expect(page.findComponent(AuthDialog).exists()).toBe(true)
    // 认证弹层出现时尚未调用任何保存接口。
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === 'POST')).toHaveLength(0)

    // 认证成功 → 只打开保存摘要弹层。
    page.findComponent(AuthDialog).vm.$emit('authenticated')
    await flushPromises()
    const summary = page.get('[data-bazi-save-summary]')
    expect(summary.text()).toContain('公历 2000-08-15')
    expect(summary.text()).toContain('手动填写')
    expect(summary.text()).toContain('包含你的出生日期')
    expect(summary.text()).toContain('不会更新本人档案')
    expect(fetchMock.mock.calls.filter(call => call[1]?.method === 'POST')).toHaveLength(0)
  })

  it('确认保存后提交稳定摘要，成功后按钮显示已保存', async () => {
    setAuth('authenticated')
    const page = await openPage()
    await generate(page, '2000', '8', '15')

    await page.get('[data-bazi-save-button]').trigger('click')
    await flushPromises()
    expect(page.find('[data-bazi-save-summary]').exists()).toBe(true)

    const confirm = page
      .findAll('.editorial-dialog-actions button')
      .find(item => item.text().includes('确认保存'))
    await confirm!.trigger('click')
    await flushPromises()

    const postCall = fetchMock.mock.calls.find(call => call[1]?.method === 'POST')
    expect(postCall).toBeTruthy()
    const body = postCall![1]!.body as {
      toolId: string
      resultId: string
      originalInput: { year: number; month: number; day: number }
      inputOrigin: string
      clientDigest: { solarDate: string; successQualifier: string }
    }
    expect(body.toolId).toBe('bazi')
    expect(body.resultId.length).toBeGreaterThan(0)
    expect(body.originalInput).toMatchObject({ year: 2000, month: 8, day: 15 })
    expect(body.inputOrigin).toBe('manual')
    expect(body.clientDigest.solarDate).toBe('2000-08-15')
    expect(body.clientDigest.successQualifier).toBe('partial')

    await flushPromises()
    expect(page.get('[data-bazi-section="actions"]').text()).toContain('本次结果已保存')
  })

  it('输入修改后（stale）保存入口禁用，并说明需重新生成', async () => {
    setAuth('authenticated')
    const page = await openPage()
    await generate(page, '2000', '8', '15')
    await page.findAll('select')[2]!.setValue('16')
    await flushPromises()

    const button = page.get('[data-bazi-save-button]')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
    expect(page.get('[data-bazi-save-hint]').text()).toContain('请先重新生成')
  })

  it('档案带入后手改日期：保存摘要的来源必须回到「手动填写」', async () => {
    setAuth('authenticated')
    // 档案可用：summary 声明 canImport，且完整档案带出生日期。
    fetchMock.mockImplementation(async (url: string, options?: { method?: string }) => {
      const method = options?.method ?? 'GET'
      if (url === '/api/self-profile/summary') {
        return {
          summary: {
            exists: true,
            profileId: 'profile-1',
            version: 1,
            hasBirthDate: true,
            canImport: true,
          },
          historyWithBirthInputCount: 1,
        }
      }
      if (url === '/api/self-profile' && method === 'GET') {
        return {
          profile: {
            id: 'profile-1',
            accountId: 12,
            version: 1,
            birthDate: {
              raw: { calendar: 'solar', year: 1990, month: 6, day: 15, isLeapMonth: null },
              solarDate: '1990-06-15',
              conversionVersion: 'profile-birth-date-v1',
              confirmedAt: '2026-09-14T02:00:00.000Z',
            },
            useAllowed: true,
            createdAt: '2026-09-14T02:00:00.000Z',
            updatedAt: '2026-09-14T02:00:00.000Z',
          },
        }
      }
      throw new Error(`unexpected request: ${method} ${url}`)
    })

    const page = await openPage()
    expect(page.find('[data-bazi-import]').exists()).toBe(true)
    await page.get('[data-bazi-import] button').trigger('click')
    await flushPromises()
    await page.get('[data-bazi-age]').setValue(true)

    const openSaveDialog = async () => {
      await page.get('[data-bazi-save-button]').trigger('click')
      await flushPromises()
      return page.get('[data-bazi-save-summary]').text()
    }

    // 未手改：来源是本人档案。
    const generateButton = () =>
      page.findAll('button').find(item => item.text().includes('生成三柱结果'))!
    await generateButton().trigger('click')
    await flushPromises()
    expect(await openSaveDialog()).toContain('从本人档案带入')
    await page
      .findAll('.editorial-dialog-actions button')
      .find(item => item.text().includes('取消'))!
      .trigger('click')
    await flushPromises()

    // 手改日期并重新生成：来源必须变成手动填写，否则快照会记录错误的 provenance。
    await page.findAll('select')[2]!.setValue('16')
    await generateButton().trigger('click')
    await flushPromises()
    expect(await openSaveDialog()).toContain('手动填写')
  })
})

describe('八字状态横幅四类文案', () => {
  function mountBanner(props: Record<string, unknown>) {
    return mount(BaziStatusBanner, { props: props as never })
  }

  it('partial：结论写清三柱／共四柱，并说明缺时柱不是错误', () => {
    const banner = mountBanner({
      state: { phase: 'success', successQualifier: 'partial', freshness: 'current' },
    })
    expect(banner.text()).toContain('已生成日期级结果：三柱（年、月、日）／共四柱，缺时柱')
    expect(banner.text()).toContain('缺少出生时刻不是错误')
    banner.unmount()
  })

  it('candidate：写明跨哪个节、有 2 种可能，并说明日柱不受影响', () => {
    const banner = mountBanner({
      state: { phase: 'success', successQualifier: 'candidate', freshness: 'current' },
      boundaryTerm: '立春',
    })
    expect(banner.text()).toContain('该日期跨〈立春〉')
    expect(banner.text()).toContain('各有 2 种可能')
    expect(banner.text()).toContain('日柱不受影响')
    banner.unmount()
  })

  it('stale：提示尚未更新并给出旧输入摘要', () => {
    const banner = mountBanner({
      state: { phase: 'success', successQualifier: 'partial', freshness: 'stale' },
      staleInputSummary: '公历 2000-08-15',
    })
    expect(banner.text()).toContain('输入已修改，结果尚未更新')
    expect(banner.text()).toContain('公历 2000-08-15')
    banner.unmount()
  })

  it('failure：按类别区分日期无效、超出范围与未完成，并说明输入是否保留', () => {
    const invalid = mountBanner({
      state: {
        phase: 'failure',
        failureCategory: 'invalid_input',
        failureDetailCode: 'FUTURE_DATE',
      },
    })
    expect(invalid.text()).toContain('日期无效')
    expect(invalid.text()).toContain('未来的出生日期')
    expect(invalid.text()).toContain('输入已保留')
    invalid.unmount()

    const unsupported = mountBanner({
      state: {
        phase: 'failure',
        failureCategory: 'unsupported_input',
        failureDetailCode: 'UNSUPPORTED_DATE',
      },
    })
    expect(unsupported.text()).toContain('超出当前支持范围')
    expect(unsupported.text()).toContain('1901-01-01')
    unsupported.unmount()

    const engine = mountBanner({
      state: { phase: 'failure', failureCategory: 'engine_error' },
    })
    expect(engine.text()).toContain('历法计算未完成，未生成任何默认结果')
    engine.unmount()
  })

  it('保存失败：明确「本次结果仍未保存」且不改变结果状态', () => {
    const banner = mountBanner({
      state: { phase: 'success', successQualifier: 'partial', freshness: 'current' },
      saveFailed: true,
    })
    expect(banner.get('[data-bazi-save-failed]').text()).toContain('本次结果仍未保存')
    banner.unmount()
  })
})
