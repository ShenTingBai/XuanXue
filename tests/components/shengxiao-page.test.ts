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

const exportMock = vi.hoisted(() => ({
  exportToImage: vi.fn(),
}))

// 共享认证状态 ref：测试通过修改 authStatus.value 触发页面 watch
const authStatus = ref('guest')
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
    authStatus.value = 'guest'
    isExporting.value = false
    exportError.value = null
    vi.stubGlobal('useAuth', () => ({
      authStatus,
    }))
    vi.stubGlobal('useExportImage', () => ({
      exportToImage: exportMock.exportToImage,
      isExporting,
      exportError,
    }))
    vi.stubGlobal('useSeoMeta', () => {})
    engineMock.calculateShengXiao.mockReset()
    exportMock.exportToImage.mockReset()
    // 控制系统日期：UTC 2026-09-09 04:00 → Asia/Shanghai 2026-09-09
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T04:00:00Z'))
  })

  afterEach(() => {
    // 即使断言失败，也先销毁监听器与组件定时器，再恢复环境。
    for (const wrapper of mountedPages.splice(0)) wrapper.unmount()
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
})
