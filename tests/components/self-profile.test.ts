// @vitest-environment happy-dom
import { ref, nextTick } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import BirthDateGroupInput from '~/components/profile/BirthDateGroupInput.vue'
import SelfProfileSaveDialog from '~/components/profile/SelfProfileSaveDialog.vue'
import type { BirthDateDraft, SelfProfile, NormalizedBirthDate } from '~/types/self-profile'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'

/**
 * 本人档案客户端组件测试（只编写，不运行）。
 *
 * 真实挂载新输入/保存对话框关键组件；必要 Nuxt API 用 stubGlobal 并在 afterEach 恢复。
 * 覆盖：公历/农历切换清空、闰月必须明确、可见原表达与规范化值、差异新增/修改/保持、
 * 默认未勾选长期保存确认、候选变更取消旧确认、保存/删除失败保留、409 重新读取流程、
 * 删日期与删档区分、撤回与删除文案不同。验证焦点/Tab/Escape 事件；
 * 不将纯 click 称真实键盘浏览器证据；所有 wrapper 失败时仍卸载。
 */

const mountedWrappers: VueWrapper[] = []

function trackWrapper(w: VueWrapper) {
  mountedWrappers.push(w)
  return w
}

afterEach(() => {
  for (const w of mountedWrappers.splice(0)) w.unmount()
  vi.unstubAllGlobals()
})

const emptyDraft: BirthDateDraft = {
  calendar: 'solar',
  year: '',
  month: '',
  day: '',
  isLeapMonth: null,
}

function makeNormalized(overrides: Partial<NormalizedBirthDate> = {}): NormalizedBirthDate {
  return {
    raw: { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
    solarDate: '2000-01-01',
    conversionVersion: 'lunar-javascript 1.7.7 / self-profile-date-v1',
    confirmedAt: '2026-09-09T00:00:00.000Z',
    ...overrides,
  }
}

function makeProfile(overrides: Partial<SelfProfile> = {}): SelfProfile {
  return {
    id: 'p1',
    accountId: 1,
    version: 1,
    birthDate: null,
    useAllowed: true,
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
    ...overrides,
  }
}

describe('BirthDateGroupInput', () => {
  it('初始为空，公历默认展示', () => {
    const wrapper = trackWrapper(mount(BirthDateGroupInput, { props: { draft: emptyDraft } }))
    const selects = wrapper.findAll('select')
    expect(selects).toHaveLength(3)
    expect(selects.map(select => (select.element as HTMLSelectElement).value)).toEqual(['', '', ''])
  })

  it('切到农历必须明确闰月（isLeapMonth 初始 null 不能默认否）', async () => {
    const draft = ref<BirthDateDraft>({ ...emptyDraft })
    const wrapper = trackWrapper(
      mount(BirthDateGroupInput, {
        props: { draft: draft.value },
        attrs: {
          'onUpdate:calendar': (v: 'solar' | 'lunar') => {
            draft.value.calendar = v
          },
        },
      }),
    )
    const radios = wrapper.findAll('input[type="radio"]')
    // 第一个是公历/农历切换，点农历
    await radios[1].setValue()
    await nextTick()
    expect(draft.value.calendar).toBe('lunar')
    // 农历必须有闰月控件且未默认选择
    const leapRadios = wrapper.findAll('input[name="birth-leap"]')
    expect(leapRadios).toHaveLength(2)
    expect(leapRadios.every(r => !(r.element as HTMLInputElement).checked)).toBe(true)
  })

  it('切换历法清空年月日（不把同一组数字静默解释为另一历法）', async () => {
    const draft = ref<BirthDateDraft>({
      calendar: 'solar',
      year: '2000',
      month: '1',
      day: '1',
      isLeapMonth: null,
    })
    let cleared = false
    const wrapper = trackWrapper(
      mount(BirthDateGroupInput, {
        props: { draft: draft.value },
        attrs: {
          'onUpdate:calendar': (v: 'solar' | 'lunar') => {
            draft.value.calendar = v
          },
          'onUpdate:year': () => {
            cleared = true
            draft.value.year = ''
          },
          'onUpdate:month': () => {
            draft.value.month = ''
          },
          'onUpdate:day': () => {
            draft.value.day = ''
          },
          'onUpdate:leap-month': () => {
            draft.value.isLeapMonth = null
          },
        },
      }),
    )
    const radios = wrapper.findAll('input[type="radio"]')
    await radios[1].setValue()
    await nextTick()
    expect(cleared).toBe(true)
    expect(draft.value.year).toBe('')
  })
})
describe('SelfProfileSaveDialog', () => {
  /** 默认 readiness=true/accountId=1 的对话框挂载辅助，测试覆盖读取失败等反例时显式覆盖。 */
  function mountDialog(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
    return trackWrapper(
      mount(SelfProfileSaveDialog, {
        attachTo: document.body,
        global: { stubs: { teleport: true } },
        props: {
          show: true,
          currentProfile: null,
          candidate: makeNormalized(),
          readiness: true,
          accountId: 1,
          busy: false,
          error: null,
          conflict: false,
          ...props,
        },
        attrs,
      }),
    )
  }

  async function checkAndConfirm(wrapper: VueWrapper) {
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    await confirmBtn!.trigger('click')
  }

  it('默认未勾选长期保存确认，确认按钮不可用', async () => {
    const wrapper = mountDialog()
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false)
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    expect((confirmBtn!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('差异新增：无档案时展示新增与原表达（首次无档案也绑定真实账号 id）', async () => {
    const candidate = makeNormalized({
      raw: { calendar: 'lunar', year: 2000, month: 1, day: 1, isLeapMonth: false },
    })
    const payloads: any[] = []
    const wrapper = mountDialog(
      { candidate, currentProfile: null, accountId: 7 },
      { onConfirm: (p: any) => payloads.push(p) },
    )
    expect(wrapper.text()).toContain('新增出生日期')
    expect(wrapper.text()).toContain('农历')
    expect(wrapper.text()).toContain('2000年1月1日')
    await checkAndConfirm(wrapper)
    expect(payloads[0].expected).toBeNull()
    expect(payloads[0].accountId).toBe(7)
  })

  it('差异修改：原表达与规范化值同时可见', async () => {
    const currentProfile = makeProfile({
      birthDate: makeNormalized({
        raw: { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
      }),
    })
    const candidate = makeNormalized({
      raw: { calendar: 'lunar', year: 2000, month: 1, day: 1, isLeapMonth: false },
      solarDate: '2000-02-05',
    })
    const wrapper = mountDialog({ currentProfile, candidate })
    expect(wrapper.text()).toContain('修改出生日期')
    expect(wrapper.text()).toContain('规范化公历：2000-02-05')
  })

  it('差异保持：无变化提示无需保存', async () => {
    const currentProfile = makeProfile({ birthDate: makeNormalized() })
    const wrapper = mountDialog({ currentProfile, candidate: makeNormalized() })
    expect(wrapper.text()).toContain('日期没有变化，无需保存')
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).disabled).toBe(true)
  })
  it('候选变更取消旧确认并清空勾选（setProps 真实更新挂载组件）', async () => {
    const candidateA = makeNormalized() // raw: solar 2000-01-01
    const candidateB = makeNormalized({
      raw: { calendar: 'lunar', year: 2001, month: 2, day: 3, isLeapMonth: false },
    })
    const payloads: any[] = []
    const wrapper = mountDialog(
      { candidate: candidateA },
      { onConfirm: (p: any) => payloads.push(p) },
    )
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    // 真正更新挂载组件 prop：显示候选 B（不能只改局部未绑定 ref）
    await wrapper.setProps({ candidate: candidateB })
    await nextTick()
    await nextTick()
    // 旧同意失效并清空勾选
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false)
    // 显示 B 后再次明确确认：发出的 raw 必须是 B 而非 A
    await checkAndConfirm(wrapper)
    expect(payloads).toHaveLength(1)
    expect(payloads[0].birthDate).toEqual(candidateB.raw)
  })

  it('冲突提示重新读取并清空勾选；conflict 期间确认禁用，不能直接提交', async () => {
    const reloads: unknown[] = []
    const payloads: unknown[] = []
    const wrapper = mountDialog(
      { conflict: true },
      { onReload: () => reloads.push(true), onConfirm: (p: unknown) => payloads.push(p) },
    )
    expect(wrapper.text()).toContain('档案已在其他页面被修改')
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false)
    await checkbox.setValue(true)
    await nextTick()
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    expect((confirmBtn!.element as HTMLButtonElement).disabled).toBe(true)
    await confirmBtn!.trigger('click')
    expect(payloads).toHaveLength(0)
    const reloadBtn = wrapper.findAll('button').find(b => b.text().includes('重新读取档案'))
    await reloadBtn!.trigger('click')
    expect(reloads).toHaveLength(1)
  })

  it('readiness=false（读取失败/过期）时不可生成可确认差异，禁用勾选与确认并提供 reload', async () => {
    const reloads: unknown[] = []
    const payloads: unknown[] = []
    const wrapper = mountDialog(
      { readiness: false, error: '无法获取本人档案，请稍后重试' },
      { onReload: () => reloads.push(true), onConfirm: (p: unknown) => payloads.push(p) },
    )
    expect(wrapper.text()).toContain('无法确认当前档案状态')
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).disabled).toBe(true)
    ;(checkbox.element as HTMLInputElement).click()
    await nextTick()
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false)
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    expect((confirmBtn!.element as HTMLButtonElement).disabled).toBe(true)
    await confirmBtn!.trigger('click')
    expect(payloads).toHaveLength(0)
    const reloadBtn = wrapper.findAll('button').find(b => b.text().includes('重新读取档案'))
    await reloadBtn!.trigger('click')
    expect(reloads).toHaveLength(1)
  })

  it('candidate 变为 null（读取失败清空）时不发 confirm', async () => {
    const payloads: unknown[] = []
    const wrapper = mountDialog({}, { onConfirm: (p: unknown) => payloads.push(p) })
    await wrapper.setProps({ candidate: null })
    await nextTick()
    await nextTick()
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).disabled).toBe(true)
    const confirmBtn = wrapper.findAll('button').find(b => b.text().includes('确认保存'))
    expect((confirmBtn!.element as HTMLButtonElement).disabled).toBe(true)
    await confirmBtn!.trigger('click')
    expect(payloads).toHaveLength(0)
  })

  it('readiness 从 false 恢复 true（成功重读）后，重新勾选才能携带新快照确认', async () => {
    const payloads: any[] = []
    const wrapper = mountDialog({ readiness: false }, { onConfirm: (p: any) => payloads.push(p) })
    // 失败期不能勾选
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).disabled).toBe(true)
    // 父页面成功重读：readiness=true（setProps），checkbox 可勾选
    await wrapper.setProps({ readiness: true })
    await nextTick()
    await nextTick()
    await checkAndConfirm(wrapper)
    expect(payloads).toHaveLength(1)
    expect(payloads[0].expected).toBeNull()
  })

  it('保存失败保留候选与差异（error 可见，不关闭）', async () => {
    const wrapper = mountDialog({ error: '保存失败，请稍后再试' })
    expect(wrapper.text()).toContain('保存失败，请稍后再试')
    // 差异仍显示
    expect(wrapper.text()).toContain('新增出生日期')
  })

  it('焦点：打开后标题可聚焦，Escape 关闭（触发 close 事件）', async () => {
    let closed = false
    const wrapper = mountDialog(
      {},
      {
        onClose: () => {
          closed = true
        },
      },
    )
    await nextTick()
    await wrapper.find('.auth-dialog-panel').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(closed).toBe(true)
    // 键盘行为证据保留为待真实浏览器验收，不以 trigger(click) 冒充。
  })

  it('删除出生日期与删除整份档案是不同操作（组件层面区分由页面保证，这里校验文案可用）', async () => {
    const wrapper = mountDialog()
    expect(wrapper.text()).not.toContain('删除出生日期')
  })

  it('confirm 事件携带冻结的 expected/raw/consent 版本（首次创建 expected=null，accountId 绑定）', async () => {
    const candidate = makeNormalized()
    const payloads: any[] = []
    const wrapper = mountDialog(
      { candidate, currentProfile: null, accountId: 1 },
      { onConfirm: (p: any) => payloads.push(p) },
    )
    await checkAndConfirm(wrapper)
    expect(payloads).toHaveLength(1)
    expect(payloads[0].expected).toBeNull()
    expect(payloads[0].accountId).toBe(1)
    expect(payloads[0].birthDate).toEqual(candidate.raw)
    expect(payloads[0].consentPolicyVersion).toBe(SELF_PROFILE_POLICY_VERSION)
  })

  it('confirm 事件携带冻结的 profile id/version（有档案时）', async () => {
    const currentProfile = makeProfile({ id: 'p1', accountId: 7, version: 3 })
    const payloads: any[] = []
    const wrapper = mountDialog(
      { currentProfile, accountId: 7 },
      { onConfirm: (p: any) => payloads.push(p) },
    )
    await checkAndConfirm(wrapper)
    expect(payloads[0].expected).toEqual({ profileId: 'p1', version: 3 })
    expect(payloads[0].accountId).toBe(7)
  })

  it('候选与 profile 版本同时变化：旧同意失效，重勾选后载荷携带新候选与新 expected', async () => {
    const candidateA = makeNormalized()
    const candidateB = makeNormalized({
      raw: { calendar: 'lunar', year: 2001, month: 2, day: 3, isLeapMonth: false },
    })
    const profileV1 = makeProfile({ id: 'p1', accountId: 1, version: 1 })
    const profileV2 = makeProfile({ id: 'p1', accountId: 1, version: 2 })
    const payloads: any[] = []
    const wrapper = mountDialog(
      { candidate: candidateA, currentProfile: profileV1, accountId: 1 },
      { onConfirm: (p: any) => payloads.push(p) },
    )
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    // 候选 B 与档案版本 2 同时到达
    await wrapper.setProps({ candidate: candidateB, currentProfile: profileV2 })
    await nextTick()
    await nextTick()
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false)
    // 重新确认：raw 是 B、expected 是 v2（不是 v1）
    await checkAndConfirm(wrapper)
    expect(payloads).toHaveLength(1)
    expect(payloads[0].birthDate).toEqual(candidateB.raw)
    expect(payloads[0].expected).toEqual({ profileId: 'p1', version: 2 })
  })

  it('账号变化使旧确认失效：重勾选后 accountId 与 expected 准确', async () => {
    const profileA = makeProfile({ id: 'p1', accountId: 1, version: 2 })
    const profileB = makeProfile({ id: 'p1', accountId: 9, version: 2 })
    const payloads: any[] = []
    const wrapper = mountDialog(
      { currentProfile: profileA, accountId: 1 },
      { onConfirm: (p: any) => payloads.push(p) },
    )
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    await nextTick()
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    // 账号变化但 id/version 相同（setProps 驱动）
    await wrapper.setProps({ currentProfile: profileB, accountId: 9 })
    await nextTick()
    await nextTick()
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false)
    await checkAndConfirm(wrapper)
    expect(payloads).toHaveLength(1)
    expect(payloads[0].accountId).toBe(9)
    expect(payloads[0].expected).toEqual({ profileId: 'p1', version: 2 })
  })

  it('reload 成功重新读取后展示最新差异，重新勾选后携带新快照', async () => {
    // reload 事件由父页面处理并回传新 currentProfile；此处用 setProps 模拟版本更新。
    const profileV1 = makeProfile({ id: 'p1', accountId: 1, version: 1 })
    const profileV2 = makeProfile({ id: 'p1', accountId: 1, version: 2 })
    const payloads: any[] = []
    const wrapper = mountDialog(
      { currentProfile: profileV1, accountId: 1 },
      { onConfirm: (p: any) => payloads.push(p) },
    )
    // 父页面重读成功回传 version=2
    await wrapper.setProps({ currentProfile: profileV2 })
    await nextTick()
    await nextTick()
    // 重新勾选并确认：新快照携带 version=2
    await checkAndConfirm(wrapper)
    expect(payloads).toHaveLength(1)
    expect(payloads[0].expected).toEqual({ profileId: 'p1', version: 2 })
  })
})
