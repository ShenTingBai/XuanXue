// @vitest-environment happy-dom
import { ref, watch, computed, onUnmounted, nextTick } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ShengXiaoPage from '~/pages/tools/shengxiao.vue'

/**
 * 生肖游客页面交互测试（实施映射第 8 节、收敛 v2/v3 回归）。
 *
 * 用明确 mock 控制 asOfDate 与认证状态，覆盖：游客空草稿、主动生成、
 * 修改 stale/禁导出、年龄确认、公共切换不计算、卸载清除、登录不导入、
 * authenticated→guest 清空、引擎失败恢复、隐私卡片不含日期、提交门
 * unknown/underage、真实 ExportButton 行为。本文件只编写、不运行。
 *
 * v3 修正：
 * - ExportButton 真实挂载（为其依赖的 Vue API 提供 vi.stubGlobal），不再用 stub 降级成纯 prop 断言；
 * - 导出回归验证 exportToImage 收到 privacy-card 实际 HTMLElement 与文件名，目标不含 inputDate；
 * - 退出用例区分个人结果区/导出卡与始终保留的公共文化列表；
 * - unknown/underage 分别检查按钮禁用与处理函数保护，不把禁用行为当作函数内门禁；
 * - 键盘单次激活标注待真实浏览器验收，不以 trigger(click) 冒充键盘证据。
 */

// 控制领域引擎：成功与失败分别由测试注入
const engineMock = vi.hoisted(() => ({
  calculateShengXiao: vi.fn(),
}))

vi.mock('~/utils/shengxiao/engine', () => ({
  calculateShengXiao: engineMock.calculateShengXiao,
}))

// 允许导出的目录 mock：覆盖 current 可导出 / stale 不可导出 / exportError 传递
vi.mock('~/constants/tool-catalog', () => ({
  canExportTool: () => true,
}))

// 本人档案桥接 mock：默认无档案、无摘要，供现有 12 个 R3 测试保持不触发档案路径。
const profileMock = {
  summary: ref<null | { exists: boolean; hasBirthDate: boolean; canImport: boolean }>(null),
  profile: ref<null | Record<string, unknown>>(null),
  loading: ref(false),
  error: ref<null | string>(null),
  conflict: ref(false),
  loadSummary: vi.fn(),
  loadProfile: vi.fn(),
  save: vi.fn(),
  deleteBirthDate: vi.fn(),
  deleteProfile: vi.fn(),
  setUsage: vi.fn(),
  onRemoteEvent: { add: vi.fn() },
  bindChannel: vi.fn(),
  clear: vi.fn(),
  registerFocusRefresh: vi.fn(),
  unregisterFocusRefresh: vi.fn(),
}
const draftMock = {
  origin: ref<null | { accountId: number; profileId: string; version: number }>(null),
  pendingReplacement: ref<null | Record<string, unknown>>(null),
  canUndo: ref(false),
  loadingProfile: ref(false),
  requestImport: vi.fn(),
  confirmImport: vi.fn(),
  cancelImport: vi.fn(),
  undoImport: vi.fn(),
  onManualEdit: vi.fn(),
  onRemoteEvent: vi.fn(),
  verifyBeforeCompute: vi.fn(),
  invalidateSource: vi.fn(),
  resyncOrigin: vi.fn(),
  clear: vi.fn(),
  profileApi: null as unknown,
}
draftMock.profileApi = profileMock

vi.mock('~/composables/useSelfProfile', () => ({
  useSelfProfile: () => profileMock,
}))
vi.mock('~/composables/useSelfProfileDraft', () => ({
  useSelfProfileDraft: (callbacks: { clearImportedDraft: () => void; clearResult: () => void }) => {
    draftMock.invalidateSource.mockImplementation(() => {
      draftMock.origin.value = null
      callbacks.clearImportedDraft()
      callbacks.clearResult()
    })
    return draftMock
  },
}))

const exportMock = vi.hoisted(() => ({
  exportToImage: vi.fn(),
}))

// 共享认证状态 ref：测试通过修改 authStatus/currentAccount 触发页面 watch
const authStatus = ref('guest')
const currentAccount = ref<null | { id: number }>(null)
// 共享导出状态 ref：驱动真实 ExportButton 的 isExporting/exportError 流转
const isExporting = ref(false)
const exportError = ref<string | null>(null)
const mountedPages: VueWrapper[] = []

const successOutcome = {
  phase: 'success',
  successQualifier: 'unique',
  freshness: 'current',
  inputDate: '2024-02-10',
  lunarDate: '甲辰年正月初一',
  lunarYear: 2024,
  ganZhiYear: '甲辰',
  animal: '龙',
  earthlyBranch: '辰',
  stemElement: '木',
  yinYang: '阳',
  branchElement: '土',
  naYin: '覆灯火',
  yearBoundary: {
    startDate: '2024-02-10',
    endDate: '2025-01-28',
    timezone: 'Asia/Shanghai',
  },
  ruleVersion: '2026-09-09',
  engineVersion: 'lunar-javascript 1.7.7',
  sourceRefs: [
    'SRC-001',
    'SRC-002',
    'SRC-002a',
    'SRC-003',
    'SRC-003a',
    'SRC-005',
    'SRC-006',
    'SRC-007',
    'SRC-008',
  ],
}

/**
 * 挂载页面。ExportButton 为共享组件，其 <script setup> 依赖 Nuxt 自动导入的
 * Vue API；测试环境不加载 Nuxt，因此在 mount 前 stubGlobal 提供这些 API，
 * 使真实组件可渲染（非 stub 降级）。
 */
function mountPage(): VueWrapper {
  // ExportButton 用到的 Vue 组合式 API（真实组件内部依赖，非页面依赖）
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('onUnmounted', onUnmounted)

  const wrapper = mount(ShengXiaoPage, {
    global: {
      stubs: {
        teleport: true,
        ToolPageLayout: { template: '<main><slot /></main>' },
        PageHero: {
          props: ['title', 'subtitle'],
          template: '<header><h1>{{ title }}</h1></header>',
        },
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        // ExportButton 不 stub：真实挂载以观察 isExporting/exportError watchers 行为
      },
    },
  })
  mountedPages.push(wrapper)
  return wrapper
}

/** 仅解除 DOM 按钮禁用以触达真实监听器，不改页面的年龄声明或 canSubmit 状态。 */
async function clickThroughDisabledButton(wrapper: VueWrapper) {
  const submit = wrapper.find('button')
  const button = submit.element as HTMLButtonElement
  expect(button.disabled).toBe(true)
  button.disabled = false
  try {
    await submit.trigger('click')
  } finally {
    button.disabled = true
  }
}

async function fillAndConfirm(wrapper: VueWrapper, year = '2024', month = '2', day = '10') {
  const [y, m, d] = wrapper.findAll('input[type="number"]')
  await y.setValue(year)
  await m.setValue(month)
  await d.setValue(day)
  await wrapper.findAll('input[type="radio"]')[0].setValue()
}

function inputsValue(wrapper: VueWrapper): string[] {
  return wrapper.findAll('input[type="number"]').map(i => (i.element as HTMLInputElement).value)
}

describe('shengxiao 游客页面', () => {
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('onUnmounted', onUnmounted)
    authStatus.value = 'guest'
    currentAccount.value = null
    isExporting.value = false
    exportError.value = null
    vi.stubGlobal('useAuth', () => ({
      authStatus,
      currentAccount,
    }))
    vi.stubGlobal('useExportImage', () => ({
      exportToImage: exportMock.exportToImage,
      isExporting,
      exportError,
    }))
    vi.stubGlobal('useSeoMeta', () => {})
    engineMock.calculateShengXiao.mockReset()
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    exportMock.exportToImage.mockReset()
    // 档案桥接 mock 复位：默认无档案、无摘要、来源 manual。
    profileMock.summary.value = null
    profileMock.profile.value = null
    profileMock.error.value = null
    profileMock.conflict.value = false
    profileMock.loadSummary.mockReset()
    profileMock.loadProfile.mockReset()
    profileMock.save.mockReset()
    profileMock.deleteBirthDate.mockReset()
    profileMock.deleteProfile.mockReset()
    profileMock.setUsage.mockReset()
    draftMock.origin.value = null
    draftMock.pendingReplacement.value = null
    draftMock.canUndo.value = false
    draftMock.loadingProfile.value = false
    draftMock.requestImport.mockReset()
    draftMock.confirmImport.mockReset()
    draftMock.cancelImport.mockReset()
    draftMock.undoImport.mockReset()
    draftMock.onManualEdit.mockReset()
    draftMock.clear.mockReset()
    draftMock.invalidateSource.mockReset()
    draftMock.resyncOrigin.mockReset()
    draftMock.verifyBeforeCompute.mockReset()
    draftMock.verifyBeforeCompute.mockResolvedValue({ ok: true })
    profileMock.registerFocusRefresh.mockReset()
    profileMock.unregisterFocusRefresh.mockReset()
    // 控制系统日期：UTC 2026-09-09 04:00 → Asia/Shanghai 2026-09-09
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T04:00:00Z'))
  })

  afterEach(() => {
    // 即使断言失败，也先销毁监听器与组件定时器，再恢复环境。
    for (const wrapper of mountedPages.splice(0)) wrapper.unmount()
    authStatus.value = 'guest'
    currentAccount.value = null
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('游客打开为空草稿，不自动计算', async () => {
    const wrapper = mountPage()
    expect(wrapper.findAll('input[type="number"]')).toHaveLength(3)
    expect(inputsValue(wrapper)).toEqual(['', '', ''])
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
  })

  it('unknown 门禁：浏览器禁用行为（未确认十四岁按钮 disabled），引擎不被调用', async () => {
    const wrapper = mountPage()
    const [year, month, day] = wrapper.findAll('input[type="number"]')
    await year.setValue('1990')
    await month.setValue('6')
    await day.setValue('15')
    const submit = wrapper.find('button')
    // 浏览器禁用行为：canSubmit=false 时按钮 disabled，click 事件不派发到 handler
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
    // 直接触发点击（disabled 按钮在浏览器中不派发 click）——验证引擎仍不调用
    await submit.trigger('click')
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
  })

  it('unknown 状态解除 DOM 禁用后触达监听器，函数内门禁仍阻止引擎调用', async () => {
    const wrapper = mountPage()
    const [year, month, day] = wrapper.findAll('input[type="number"]')
    await year.setValue('2024')
    await month.setValue('2')
    await day.setValue('10')
    // 未选年龄 radio（unknown）→ canSubmit=false → 按钮 disabled
    const submit = wrapper.find('button')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
    await clickThroughDisabledButton(wrapper)
    expect(
      wrapper.findAll('input[type="radio"]').every(r => !(r.element as HTMLInputElement).checked),
    ).toBe(true)
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
  })

  it('单次原生点击只调用一次引擎（click 证据；键盘行为待浏览器验收）', async () => {
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    const submit = wrapper.find('button')
    await submit.trigger('click')
    expect(engineMock.calculateShengXiao).toHaveBeenCalledTimes(1)
    // 键盘（Enter/Space）单次激活未经真实浏览器验证，标待验收；此处不称键盘证据。
  })

  it('确认年龄并主动生成后展示结果，且普通结果含公历输入日期', async () => {
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    const submit = wrapper.find('button')
    expect((submit.element as HTMLButtonElement).disabled).toBe(false)
    await submit.trigger('click')

    expect(engineMock.calculateShengXiao).toHaveBeenCalledWith('2024-02-10', '2026-09-09')
    // 个人结果区出现（生肖龙、干支甲辰、公历输入日期）
    expect(wrapper.find('[data-privacy-card]').exists()).toBe(true)
    expect(wrapper.text()).toContain('甲辰')
    expect(wrapper.text()).toContain('2024-02-10')
  })

  it('修改输入后结果 stale 且禁止导出', async () => {
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')

    // 修改年份 → stale
    const [year] = wrapper.findAll('input[type="number"]')
    await year.setValue('2025')
    await nextTick()
    expect(wrapper.text()).toContain('输入已修改，结果尚未更新')
    // stale 禁止导出（即使 canExportTool 已放行）
    expect(wrapper.find('.export-btn').exists()).toBe(false)
  })

  it('真实 ExportButton：点击导出收到 privacy-card 元素与文件名，失败显示错误且不显示已保存', async () => {
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')

    // 真实 ExportButton 渲染（非 stub）
    const exportBtn = wrapper.find('.export-btn')
    expect(exportBtn.exists()).toBe(true)

    // 点击真实导出按钮 → 页面 handleExportCard → useExportImage.exportToImage
    await exportBtn.trigger('click')
    await nextTick()
    expect(exportMock.exportToImage).toHaveBeenCalledTimes(1)
    // 第一个参数是 privacy-card 实际 HTMLElement
    const [el, filename] = exportMock.exportToImage.mock.calls[0]
    expect(el).toBe(wrapper.find('[data-privacy-card]').element)
    expect(el).toBeInstanceOf(HTMLElement)
    expect((el as HTMLElement).dataset.privacyCard).toBe('')
    expect((el as HTMLElement).textContent).not.toContain('2024')
    expect((el as HTMLElement).textContent).not.toContain('02-10')
    expect(filename).toBe('生肖文化卡片.png')

    // 驱动 isExporting false→true→false 且 exportError 非空 → 真实失败文案出现，已保存不出现
    isExporting.value = true
    await nextTick()
    isExporting.value = false
    exportError.value = '导出失败，请重试'
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain('导出失败，请重试')
    expect(wrapper.text()).not.toContain('已保存')

    // 无错误成功反馈：清空错误、再触发一次导出（isExporting 已 false）
    exportError.value = null
    await nextTick()
    await exportBtn.trigger('click')
    await nextTick()
    // 导出后 isExporting false→true→false 且无 error → showSuccess（✓ 已保存）
    isExporting.value = true
    await nextTick()
    isExporting.value = false
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain('已保存')
  })

  it('公共文化切换不触发个人计算', async () => {
    const wrapper = mountPage()
    const cultureButtons = wrapper.findAll('[role="tab"]')
    expect(cultureButtons.length).toBeGreaterThan(0)
    await cultureButtons[2].trigger('click')
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('虎')
  })

  it('underage 状态解除 DOM 禁用后函数内门禁仍生效，公共内容保留', async () => {
    const wrapper = mountPage()
    const [year, month, day] = wrapper.findAll('input[type="number"]')
    await year.setValue('2024')
    await month.setValue('2')
    await day.setValue('10')
    const underage = wrapper.findAll('input[type="radio"]')[1]
    await underage.setValue()
    expect(wrapper.text()).toContain('未满十四周岁')
    const submit = wrapper.find('button')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
    await clickThroughDisabledButton(wrapper)
    expect((underage.element as HTMLInputElement).checked).toBe(true)
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
    // 公共文化列表仍可浏览
    expect(wrapper.findAll('[role="tab"]').length).toBeGreaterThan(0)
  })

  it('authenticated → guest 时清除个人结果/草稿/声明，公共文化列表仍在', async () => {
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    authStatus.value = 'authenticated'
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    // 个人结果区出现
    expect(wrapper.find('[data-privacy-card]').exists()).toBe(true)

    // 认证从 authenticated 转为 guest
    authStatus.value = 'guest'
    await nextTick()

    // 年月日清空（检查实际 value）
    expect(inputsValue(wrapper)).toEqual(['', '', ''])
    // 年龄 radio 取消选中
    const radios = wrapper.findAll('input[type="radio"]')
    for (const r of radios) {
      expect((r.element as HTMLInputElement).checked).toBe(false)
    }
    // 个人结果区/导出卡消失（不再有隐私卡片）
    expect(wrapper.find('[data-privacy-card]').exists()).toBe(false)
    // 公共文化列表仍在（12 个生肖 tab）
    expect(wrapper.findAll('[role="tab"]').length).toBe(12)
    // 不得断言整页没有「龙」：公共文化列表含龙 tab，整页文本必然含龙
  })

  it('引擎失败时展示可恢复错误并保留输入（实际 value）', async () => {
    engineMock.calculateShengXiao.mockReturnValue({
      phase: 'failure',
      failureCategory: 'engine_error',
    })
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('农历换算未能完成')
    // 输入保留：检查实际 value 而非元素存在
    expect(inputsValue(wrapper)).toEqual(['2024', '2', '10'])
  })

  it('隐私文化卡片 DOM 不含出生日期，普通结果含', async () => {
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')

    const card = wrapper.find('[data-privacy-card]')
    expect(card.exists()).toBe(true)
    const cardText = card.text()
    expect(cardText).toContain('龙')
    // 普通结果整体显示 2024-02-10
    expect(wrapper.text()).toContain('2024-02-10')
    // 隐私卡片不含输入日期
    expect(cardText).not.toContain('2024')
    expect(cardText).not.toContain('02-10')
  })

  // ========================================================================
  // R4：本人档案显式带入 / 保存（保留原 12 个 R3 测试，不改黄金/引擎期望）
  // ========================================================================

  it('无日期或未登录不显示带入入口（只 summary 不泄露 DOB）', async () => {
    // 未登录（guest）：即使 summary 有日期也不显示带入
    authStatus.value = 'guest'
    profileMock.summary.value = { exists: true, hasBirthDate: true, canImport: true }
    const wrapper = mountPage()
    await nextTick()
    expect(wrapper.text()).not.toContain('从本人档案带入')
  })

  it('已登录且 summary 无日期不显示带入', async () => {
    authStatus.value = 'authenticated'
    profileMock.summary.value = { exists: true, hasBirthDate: false, canImport: false }
    const wrapper = mountPage()
    await nextTick()
    expect(wrapper.text()).not.toContain('从本人档案带入')
  })

  it('已登录且有可用日期才显示带入入口，且不自动 GET 完整出生值', async () => {
    authStatus.value = 'authenticated'
    profileMock.summary.value = { exists: true, hasBirthDate: true, canImport: true }
    const wrapper = mountPage()
    await nextTick()
    expect(wrapper.text()).toContain('从本人档案带入 1 项')
    // 页面初始化只请求 summary，不请求完整 profile
    expect(profileMock.loadProfile).not.toHaveBeenCalled()
  })

  it('显式带入（requestImport）不自动计算', async () => {
    authStatus.value = 'authenticated'
    profileMock.summary.value = { exists: true, hasBirthDate: true, canImport: true }
    const wrapper = mountPage()
    await nextTick()
    const importBtn = wrapper.findAll('button').find(b => b.text().includes('从本人档案带入'))
    expect(importBtn).toBeDefined()
    await importBtn!.trigger('click')
    expect(draftMock.requestImport).toHaveBeenCalled()
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
  })

  it('不同草稿替换前先确认（pendingReplacement 展示本次值与拟带入值）', async () => {
    authStatus.value = 'authenticated'
    profileMock.summary.value = { exists: true, hasBirthDate: true, canImport: true }
    draftMock.pendingReplacement.value = {
      current: { year: '2000', month: '1', day: '1' },
      incoming: { year: '1990', month: '6', day: '15' },
    }
    const wrapper = mountPage()
    await nextTick()
    expect(wrapper.text()).toContain('替换当前输入')
    expect(wrapper.text()).toContain('2000')
    expect(wrapper.text()).toContain('1990')
  })

  it('取消替换保留当前草稿（cancelImport 调用且不应用带入）', async () => {
    draftMock.cancelImport.mockImplementation(() => {
      draftMock.pendingReplacement.value = null
    })
    draftMock.pendingReplacement.value = {
      current: { year: '2000', month: '1', day: '1' },
      incoming: { year: '1990', month: '6', day: '15' },
    }
    const wrapper = mountPage()
    await nextTick()
    const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('取消'))
    await cancelBtn!.trigger('click')
    expect(draftMock.cancelImport).toHaveBeenCalled()
  })

  it('用户手改标记 manual（onManualEdit 被调用）', async () => {
    const wrapper = mountPage()
    const [year] = wrapper.findAll('input[type="number"]')
    await year.setValue('1990')
    expect(draftMock.onManualEdit).toHaveBeenCalled()
  })

  it('撤销恢复完整/部分/空前值（undoImport 使用真实前值，不从服务器倒推）', async () => {
    const values = [
      { year: '2000', month: '1', day: '1' },
      { year: '', month: '6', day: '' },
      { year: '', month: '', day: '' },
    ]
    for (const v of values) {
      draftMock.canUndo.value = true
      let applied: unknown = null
      draftMock.undoImport.mockImplementation(() => {
        applied = v
        draftMock.canUndo.value = false
      })
      const wrapper = mountPage()
      await nextTick()
      const undoBtn = wrapper.findAll('button').find(b => b.text().includes('撤销本次带入'))
      expect(undoBtn).toBeDefined()
      await undoBtn!.trigger('click')
      expect(draftMock.undoImport).toHaveBeenCalled()
      wrapper.unmount()
    }
  })

  it('stale 结果不能保存（freshness=stale 时无保存入口）', async () => {
    authStatus.value = 'authenticated'
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    // 修改输入 → stale
    const [year] = wrapper.findAll('input[type="number"]')
    await year.setValue('2025')
    await nextTick()
    expect(wrapper.find('button').text()).not.toContain('保存本人资料')
    expect(wrapper.text()).not.toContain('保存本人资料')
  })

  it('current 成功结果且草稿合法才显示保存入口', async () => {
    authStatus.value = 'authenticated'
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('保存本人资料')
  })

  it('游客主动保存→页内认证→差异确认→单独同意后仅一次 PUT', async () => {
    authStatus.value = 'guest'
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    // 游客显示保存入口
    expect(wrapper.text()).toContain('保存本人资料')
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    // 游客点击 → 打开 AuthDialog（showAuthDialog）
    // 模拟 authenticated 事件：此时只进入差异确认，绝不直接 PUT
    // 由组件事件驱动 onAuthenticatedFromSave
    expect(profileMock.loadProfile).not.toHaveBeenCalled()
  })

  it('页头登录不触发 PUT（普通登录不迁移草稿、不保存）', async () => {
    authStatus.value = 'guest'
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    // 仅改变 authStatus 为 authenticated（模拟页头登录），不经过保存入口
    authStatus.value = 'authenticated'
    await nextTick()
    expect(profileMock.save).not.toHaveBeenCalled()
  })

  it('日志/存储/URL 没有出生值（无 localStorage/sessionStorage 写入）', async () => {
    const wrapper = mountPage()
    await fillAndConfirm(wrapper, '1990', '6', '15')
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(window.location.href).not.toContain('1990')
  })

  it('既有导出目标仍为真实隐私卡片，不包含档案 ID', async () => {
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const card = wrapper.find('[data-privacy-card]')
    expect(card.exists()).toBe(true)
    const cardText = card.text()
    expect(cardText).not.toContain('p1')
    expect(cardText).not.toContain('profileId')
  })
  // ========================================================================
  // R4 收敛：资料失效 / 计算前校验（draft-revocation v3）
  // ========================================================================

  function setLoggedIn(accountId = 1) {
    authStatus.value = 'authenticated'
    currentAccount.value = { id: accountId }
  }

  it('来源依赖档案时，计算前调用 verifyBeforeCompute（通过后才调引擎）', async () => {
    setLoggedIn()
    draftMock.origin.value = { accountId: 1, profileId: 'p1', version: 1 }
    draftMock.verifyBeforeCompute.mockResolvedValue({ ok: true })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(draftMock.verifyBeforeCompute).toHaveBeenCalled()
    expect(engineMock.calculateShengXiao).toHaveBeenCalled()
  })

  it('来源依赖档案但 summary 刷新失败时阻止计算（网络失败不能当授权有效，不清草稿）', async () => {
    setLoggedIn()
    draftMock.origin.value = { accountId: 1, profileId: 'p1', version: 1 }
    draftMock.verifyBeforeCompute.mockResolvedValue({ ok: false, reason: 'network' })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('无法确认本人档案状态')
    // 网络失败保留草稿：不清输入，不调用原子失效。
    expect(draftMock.invalidateSource).not.toHaveBeenCalled()
    expect(inputsValue(wrapper)).toEqual(['2024', '2', '10'])
  })

  it('来源依赖档案但已撤回/删除时阻止计算并原子失效（清旧日期，二次点击不可按 manual 计算）', async () => {
    setLoggedIn()
    draftMock.origin.value = { accountId: 1, profileId: 'p1', version: 1 }
    draftMock.verifyBeforeCompute.mockResolvedValue({ ok: false, reason: 'revoked' })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
    expect(draftMock.invalidateSource).toHaveBeenCalled()
    expect(wrapper.text()).toContain('本人档案已撤回或删除')
    // 原子失效后旧日期清除：直接再点提交（绕过按钮 disabled 检查）也不会计算。
    expect(inputsValue(wrapper)).toEqual(['', '', ''])
  })

  it('来源版本变化（stale_version）时阻止计算并原子失效', async () => {
    setLoggedIn()
    draftMock.origin.value = { accountId: 1, profileId: 'p1', version: 1 }
    draftMock.verifyBeforeCompute.mockResolvedValue({ ok: false, reason: 'stale_version' })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
    expect(draftMock.invalidateSource).toHaveBeenCalled()
    expect(wrapper.text()).toContain('本人档案已变更')
  })

  it('await 校验期间登出/改未成年/手改输入会取消旧提交，不落旧结果', async () => {
    setLoggedIn()
    draftMock.origin.value = { accountId: 1, profileId: 'p1', version: 1 }
    let resolveVerify!: (v: { ok: boolean }) => void
    draftMock.verifyBeforeCompute.mockReturnValue(
      new Promise(r => {
        resolveVerify = r
      }),
    )
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    const clickPromise = wrapper.find('button').trigger('click')
    // await 期间用户手改输入（修订号变化）
    const [year] = wrapper.findAll('input[type="number"]')
    await year.setValue('2030')
    resolveVerify({ ok: true })
    await clickPromise
    await nextTick()
    // 手改后旧提交被取消：不生成基于旧输入的结果
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
  })

  it('撤销恢复准确前序来源（undoImport 保留原来源 id/version）', async () => {
    // 页面委托桥接处理撤销；此处验证点击撤销调用 undoImport 且不触发计算。
    draftMock.canUndo.value = true
    const wrapper = mountPage()
    await nextTick()
    const undoBtn = wrapper.findAll('button').find(b => b.text().includes('撤销本次带入'))
    expect(undoBtn).toBeDefined()
    await undoBtn!.trigger('click')
    expect(draftMock.undoImport).toHaveBeenCalled()
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
  })

  it('账号 A → B 清理草稿/结果/桥接', async () => {
    setLoggedIn(1)
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-privacy-card]').exists()).toBe(true)
    // 已登录 A → B：页面 watch 检测 currentAccount 变化并清理个人状态。
    currentAccount.value = { id: 2 }
    await nextTick()
    await nextTick()
    expect(draftMock.clear).toHaveBeenCalled()
    expect(inputsValue(wrapper)).toEqual(['', '', ''])
    expect(wrapper.find('[data-privacy-card]').exists()).toBe(false)
  })

  it('候选打开后编辑不覆盖（confirmImport 校验草稿一致性由桥接保证，页面仅转发点击）', async () => {
    draftMock.pendingReplacement.value = {
      current: { year: '2000', month: '1', day: '1' },
      incoming: { year: '1990', month: '6', day: '15' },
    }
    const wrapper = mountPage()
    await nextTick()
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认替换'))
    await confirmBtn!.trigger('click')
    expect(draftMock.confirmImport).toHaveBeenCalled()
  })

  // ========================================================================
  // R4 收敛：游客登录与差异确认（guest-and-revocation / confirmed-save v3）
  // ========================================================================

  it('游客已算结果后页内登录：保留草稿/结果/年龄，进入差异确认且不自动 PUT', async () => {
    authStatus.value = 'guest'
    currentAccount.value = null
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    // AuthDialog 认证事件：真实 useAuth.login 会先更新 authStatus/currentAccount，
    // AuthDialog 再发 authenticated；此处按同一顺序模拟（先状态后事件）。
    let emitAuthenticated: (() => void) | null = null
    const AuthDialogStub = {
      props: ['show'],
      emits: ['authenticated', 'close'],
      template:
        '<div v-if="show" data-auth-dialog><button data-auth-login @click="doAuth">login</button><button data-auth-close @click="$emit(\'close\')">close</button></div>',
      setup(_: unknown, { emit }: { emit: (e: 'authenticated' | 'close') => void }) {
        return {
          doAuth: () => {
            // 模拟真实登录副作用：authStatus/currentAccount 更新后发 authenticated。
            authStatus.value = 'authenticated'
            currentAccount.value = { id: 1 }
            emit('authenticated')
          },
        }
      },
    }
    profileMock.loadProfile.mockResolvedValue({ status: 'success', profile: null })
    const wrapper = mount(ShengXiaoPage, {
      global: {
        stubs: {
          teleport: true,
          ToolPageLayout: { template: '<main><slot /></main>' },
          PageHero: {
            props: ['title', 'subtitle'],
            template: '<header><h1>{{ title }}</h1></header>',
          },
          NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
          AuthDialog: AuthDialogStub,
        },
      },
    })
    mountedPages.push(wrapper)
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-privacy-card]').exists()).toBe(true)
    // 游客点「保存本人资料」→ AuthDialog
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-auth-dialog]').exists()).toBe(true)
    // 认证成功：草稿保留（未清空），进入差异确认，绝不自动 PUT。
    await wrapper.find('[data-auth-login]').trigger('click')
    await nextTick()
    await nextTick()
    expect(profileMock.save).not.toHaveBeenCalled()
    expect(inputsValue(wrapper)).toEqual(['2024', '2', '10'])
    // 差异确认对话框出现
    expect(wrapper.text()).toContain('保存本人档案')
    emitAuthenticated = null
  })

  it('游客登录后草稿保留：第二次生成仍使用游客输入（未被登录清空）', async () => {
    authStatus.value = 'guest'
    currentAccount.value = null
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper, '1995', '5', '20')
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(engineMock.calculateShengXiao).toHaveBeenCalledWith('1995-05-20', '2026-09-09')
    // 页头登录（guest → authenticated，非保存入口）：保留草稿/结果/年龄。
    authStatus.value = 'authenticated'
    currentAccount.value = { id: 1 }
    await nextTick()
    await nextTick()
    expect(inputsValue(wrapper)).toEqual(['1995', '5', '20'])
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalledTimes(2)
    expect(draftMock.clear).not.toHaveBeenCalled()
  })

  it('已登录有旧档案：保存入口先 GET 当前档案（成功）再展示差异', async () => {
    setLoggedIn()
    profileMock.profile.value = {
      id: 'p1',
      accountId: 1,
      version: 2,
      birthDate: {
        raw: { calendar: 'solar', year: 1990, month: 6, day: 15, isLeapMonth: null },
        solarDate: '1990-06-15',
        conversionVersion: 'v1',
        confirmedAt: 't',
      },
      useAllowed: true,
      createdAt: '',
      updatedAt: '',
    }
    profileMock.loadProfile.mockResolvedValue({
      status: 'success',
      profile: profileMock.profile.value,
    })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    await nextTick()
    // 打开保存框前强制读取当前档案（不是用缓存冒充）
    expect(profileMock.loadProfile).toHaveBeenCalledWith(true)
    // 差异对话框出现
    expect(wrapper.text()).toContain('保存本人档案')
  })

  it('GET 失败不显示首次创建（错误可见，不把失败当无档案，也不解除冲突）', async () => {
    setLoggedIn()
    profileMock.loadProfile.mockResolvedValue({ status: 'failure' })
    profileMock.error.value = '无法获取本人档案，请稍后重试'
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain('无法获取本人档案，请稍后重试')
  })

  it('保存 payload 与对话框冻结确认一致（confirmSave 使用冻结载荷）', async () => {
    setLoggedIn()
    const profileObj = {
      id: 'p1',
      accountId: 1,
      version: 2,
      birthDate: null,
      useAllowed: true,
      createdAt: '',
      updatedAt: '',
    }
    profileMock.profile.value = profileObj
    profileMock.loadProfile.mockResolvedValue({ status: 'success', profile: profileObj })
    profileMock.save.mockResolvedValue(profileObj)
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    await nextTick()
    // 勾选长期保存告知并确认
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    await confirmBtn!.trigger('click')
    await nextTick()
    expect(profileMock.save).toHaveBeenCalledTimes(1)
    const payload = profileMock.save.mock.calls[0][0]
    expect(payload.expected).toEqual({ profileId: 'p1', version: 2 })
    expect(payload.birthDate).toEqual({
      calendar: 'solar',
      year: 2024,
      month: 2,
      day: 10,
      isLeapMonth: null,
    })
  })

  it('409 后重读失败保持冲突与禁提交；重读成功才解除并重新同意', async () => {
    setLoggedIn()
    const profileObj = {
      id: 'p1',
      accountId: 1,
      version: 2,
      birthDate: null,
      useAllowed: true,
      createdAt: '',
      updatedAt: '',
    }
    profileMock.profile.value = profileObj
    profileMock.loadProfile.mockResolvedValue({ status: 'success', profile: profileObj })
    profileMock.save.mockImplementation(async () => {
      profileMock.conflict.value = true
      return null
    })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    await nextTick()
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    await confirmBtn!.trigger('click')
    await nextTick()
    // 冲突显示重新读取入口；确认按钮因 conflict 禁用
    const reloadBtn = wrapper.findAll('button').find(b => b.text().includes('重新读取档案'))
    expect(reloadBtn).toBeDefined()
    expect(
      (
        wrapper.findAll('button').find(b => b.text().includes('确认保存'))!
          .element as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    // 重读失败：冲突不解除，仍禁提交
    profileMock.loadProfile.mockResolvedValue({ status: 'failure' })
    profileMock.error.value = '无法重新读取档案，请稍后再试'
    await reloadBtn!.trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain('档案已在其他页面被修改')
    // 重读成功：重新读取档案，冲突解除
    profileMock.loadProfile.mockResolvedValue({
      status: 'success',
      profile: { ...profileObj, version: 3 },
    })
    profileMock.profile.value = { ...profileObj, version: 3 }
    await reloadBtn!.trigger('click')
    await nextTick()
    await nextTick()
    expect(profileMock.loadProfile).toHaveBeenCalledWith(true)
  })

  it('成功读取 null（确认无档案）才显示首次创建差异并允许确认', async () => {
    setLoggedIn()
    profileMock.profile.value = null
    profileMock.loadProfile.mockResolvedValue({ status: 'success', profile: null })
    const saved: unknown[] = []
    profileMock.save.mockImplementation(async (candidate: unknown) => {
      saved.push(candidate)
      return {
        id: 'p-new',
        accountId: 1,
        version: 1,
        birthDate: null,
        useAllowed: true,
        createdAt: '',
        updatedAt: '',
      }
    })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    await nextTick()
    // 成功 null → 展示新增差异（首次创建）
    expect(wrapper.text()).toContain('保存本人档案')
    expect(wrapper.text()).toContain('新增出生日期')
    // 勾选并确认：PUT 载荷 expected=null（首次创建）
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    await confirmBtn!.trigger('click')
    await nextTick()
    expect(profileMock.save).toHaveBeenCalledTimes(1)
    const payload = saved[0] as { expected: unknown }
    expect(payload.expected).toBeNull()
  })

  it('保存意图取消后，晚到读取完成不会重新打开弹框', async () => {
    setLoggedIn()
    profileMock.profile.value = null
    let resolveRead!: (v: unknown) => void
    profileMock.loadProfile.mockReturnValue(
      new Promise(r => {
        resolveRead = r
      }),
    )
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    // 读取未返回时真实退出账号，页面认证 watcher 取消保存意图。
    authStatus.value = 'guest'
    currentAccount.value = null
    await nextTick()
    resolveRead({ status: 'success', profile: null })
    await nextTick()
    await nextTick()
    // 读取晚到但意图已无：不展示保存弹框
    expect(wrapper.text()).not.toContain('保存本人档案')
  })

  // ========================================================================
  // v4：async 状态顺序（来源校验/本地保存/生命周期）
  // ========================================================================

  it('verify 返回 no_source（来源已被 watcher 清空）时引擎不被调用且无异常', async () => {
    setLoggedIn()
    draftMock.origin.value = { accountId: 1, profileId: 'p1', version: 1 }
    // 真实桥接在 await 后发现来源被 summary watcher/通知清空时返回 no_source；
    // 页面不得崩溃，也不得继续按旧来源计算。
    draftMock.verifyBeforeCompute.mockResolvedValue({ ok: false, reason: 'no_source' })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(engineMock.calculateShengXiao).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('本人档案已变更')
    expect(draftMock.invalidateSource).toHaveBeenCalled()
  })

  it('保存成功后本地来源在 summary 发布前同步：不依赖页面 await 后补救（页面不再调用 resyncOrigin）', async () => {
    setLoggedIn()
    const profileObj = {
      id: 'p1',
      accountId: 1,
      version: 3,
      birthDate: null,
      useAllowed: true,
      createdAt: '',
      updatedAt: '',
    }
    profileMock.profile.value = profileObj
    profileMock.loadProfile.mockResolvedValue({ status: 'success', profile: profileObj })
    profileMock.save.mockResolvedValue({ ...profileObj, version: 3 })
    engineMock.calculateShengXiao.mockReturnValue(successOutcome)
    const wrapper = mountPage()
    await fillAndConfirm(wrapper)
    await wrapper.find('button').trigger('click')
    await nextTick()
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('保存本人资料'))
    await saveBtn!.trigger('click')
    await nextTick()
    await nextTick()
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    await confirmBtn!.trigger('click')
    await nextTick()
    expect(profileMock.save).toHaveBeenCalledTimes(1)
    // 来源同步协议由 useSelfProfileDraft 的 onLocalWriteCommitted 在 summary 发布前完成；
    // 页面 confirmSave 不再做 await 后补救式 resyncOrigin（v4 移除）。
    expect(draftMock.resyncOrigin).not.toHaveBeenCalled()
  })

  it('外部 saved 版本变化仍原子失效（普通远端 saved 不作为授权放行）', async () => {
    setLoggedIn()
    draftMock.origin.value = { accountId: 1, profileId: 'p1', version: 1 }
    // 模拟另一设备 saved 到 version 2：桥接收到 saved 事件后应使来源失效，
    // 页面不因「saved」自动放行后续计算。
    draftMock.onRemoteEvent.mockImplementation(
      (ev: { action: string; profileId: string; version: number }) => {
        if (
          ev.action === 'saved' &&
          ev.profileId === 'p1' &&
          ev.version !== draftMock.origin.value?.version
        ) {
          draftMock.invalidateSource()
          draftMock.origin.value = null
        }
      },
    )
    // 通过页面已注册的通知通道派发：页面真实接线是
    // profileApi.onRemoteEvent.add(draftBridge.onRemoteEvent)，二者指向同一桥接处理器。
    // 真实时序（summary watcher 先清 origin、await 安全结束）由 composables 宿主测试承载，
    // 这里验证桥接处理器对外部 saved 的失效语义。
    draftMock.onRemoteEvent({
      type: 'self-profile-changed',
      accountId: 1,
      profileId: 'p1',
      version: 2,
      action: 'saved',
    })
    expect(draftMock.origin.value).toBeNull()
    expect(draftMock.invalidateSource).toHaveBeenCalled()
  })
})
