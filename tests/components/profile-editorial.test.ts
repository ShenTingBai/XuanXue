// @vitest-environment happy-dom
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileMasthead from '~/components/profile/ProfileMasthead.vue'
import ProfileUsageSection from '~/components/profile/ProfileUsageSection.vue'
import ProfileScopeSection from '~/components/profile/ProfileScopeSection.vue'
import ProfileDangerZone from '~/components/profile/ProfileDangerZone.vue'
import ProfileRecordCard from '~/components/profile/ProfileRecordCard.vue'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'

describe('ProfileMasthead', () => {
  it('档案页用法：状态胶囊与元信息按传入文案渲染', () => {
    const saved = mount(ProfileMasthead, {
      props: {
        edition: '第一阶段 · 出生日期字段组',
        title: '本人档案',
        subtitle: '账号名下唯一一份 · 仅账号本人可见',
        statusText: '出生日期已保存',
        metaText: '最近更新 2026-09-13 10:15',
      },
    })
    expect(saved.text()).toContain('出生日期已保存')
    expect(saved.text()).toContain('最近更新 2026-09-13 10:15')
    expect(saved.text()).toContain('第一阶段 · 出生日期字段组')
    expect(saved.text()).toContain('账号名下唯一一份 · 仅账号本人可见')
    expect(saved.find('h1').text()).toBe('本人档案')
  })

  it('账号页用法：主标题可以是昵称，且不传状态胶囊时不渲染胶囊', () => {
    const wrapper = mount(ProfileMasthead, {
      props: {
        edition: '账号与会话',
        title: '验收账号',
        subtitle: '昵称注册后不可修改 · 仅账号本人可见',
        metaText: '创建于 2026-09-13',
      },
    })
    expect(wrapper.find('.tag').exists()).toBe(false)
    expect(wrapper.text()).toContain('创建于 2026-09-13')
    expect(wrapper.find('h1').text()).toBe('验收账号')
  })

  it('元信息缺失时显示占位，不渲染空行', () => {
    const wrapper = mount(ProfileMasthead, {
      props: { edition: '账号与会话', title: '验收账号', subtitle: '副题' },
    })
    expect(wrapper.text()).toContain('—')
  })
})

describe('ProfileUsageSection', () => {
  it('有日期且允许带入：已开启 + 停止后续带入', async () => {
    const wrapper = mount(ProfileUsageSection, {
      props: { hasDate: true, useAllowed: true, busy: false },
    })
    expect(wrapper.text()).toContain('已开启')
    const button = wrapper.findAll('button').find(b => b.text().includes('停止后续带入'))
    expect(button).toBeTruthy()
    await button!.trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  it('有日期但已停止：已停止 + 重新允许带入', async () => {
    const wrapper = mount(ProfileUsageSection, {
      props: { hasDate: true, useAllowed: false, busy: false },
    })
    expect(wrapper.text()).toContain('已停止')
    expect(wrapper.text()).toContain('重新允许需要再次同意当前告知版本')
    const button = wrapper.findAll('button').find(b => b.text().includes('重新允许带入'))
    await button!.trigger('click')
    expect(wrapper.emitted('allow')).toHaveLength(1)
  })

  it('没有日期：不可用 + 重新填写出生日期', async () => {
    const wrapper = mount(ProfileUsageSection, {
      props: { hasDate: false, useAllowed: false, busy: false },
    })
    expect(wrapper.text()).toContain('不可用')
    const button = wrapper.findAll('button').find(b => b.text().includes('重新填写出生日期'))
    await button!.trigger('click')
    expect(wrapper.emitted('refill')).toHaveLength(1)
  })

  it('busy 时不触发任何事件', async () => {
    const wrapper = mount(ProfileUsageSection, {
      props: { hasDate: true, useAllowed: true, busy: true },
    })
    const button = wrapper.findAll('button')[0]
    await button!.trigger('click')
    expect(wrapper.emitted('stop')).toBeUndefined()
  })

  it('四类用途矩阵与《用户档案与数据生命周期产品规范》§10.1 一致', () => {
    const wrapper = mount(ProfileUsageSection, {
      props: { hasDate: true, useAllowed: true, busy: false },
    })
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(4)
    const cells = rows.map(row => row.findAll('td').map(cell => cell.text()))
    expect(cells).toEqual([
      ['本次计算', '阅读就近说明后主动提交', '否', '否'],
      ['保存本人档案', '主动发起并确认字段差异', '是', '不代表保存结果'],
      ['保存本次结果', '主动确认结果快照内容', '是', '不代表更新档案'],
      ['保存内容偏好', '主动选择偏好', '是', '不得用于命理与现实推断'],
    ])
  })

  it('窄屏卡片化所需的列名标签齐全', () => {
    const wrapper = mount(ProfileUsageSection, {
      props: { hasDate: true, useAllowed: true, busy: false },
    })
    const labels = wrapper.findAll('tbody td').map(cell => cell.attributes('data-label'))
    expect(labels).toEqual([
      '用途',
      '用户动作',
      '默认保存',
      '可否影响其他用途',
      '用途',
      '用户动作',
      '默认保存',
      '可否影响其他用途',
      '用途',
      '用户动作',
      '默认保存',
      '可否影响其他用途',
      '用途',
      '用户动作',
      '默认保存',
      '可否影响其他用途',
    ])
  })
})

describe('ProfileScopeSection', () => {
  it('展示真实告知版本而不是设计稿示例版本', () => {
    const wrapper = mount(ProfileScopeSection, {
      props: { policyVersion: SELF_PROFILE_POLICY_VERSION },
      global: { stubs: { NuxtLink: true } },
    })
    expect(wrapper.text()).toContain(SELF_PROFILE_POLICY_VERSION)
    expect(wrapper.text()).not.toContain('1.2.0')
    expect(wrapper.text()).toContain('我们保存了什么')
    expect(wrapper.text()).toContain('我们没有保存')
  })
})

describe('ProfileDangerZone', () => {
  it('默认折叠：aria-expanded=false，操作内容不可见', async () => {
    const wrapper = mount(ProfileDangerZone, {
      props: { hasProfile: true, hasBirthDate: true, busy: false },
    })
    // v-show 的 display 在渲染副作用里写入，需要等一次 tick 再断言。
    await nextTick()
    const toggle = wrapper.get('button')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#profile-danger-body').attributes('style')).toContain('display: none')
    expect(wrapper.text()).toContain('危险操作 · 展开查看')
  })

  it('展开后显示删除项并回传事件', async () => {
    const wrapper = mount(ProfileDangerZone, {
      props: { hasProfile: true, hasBirthDate: true, busy: false },
    })
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    await nextTick()
    expect(wrapper.get('#profile-danger-body').attributes('style') ?? '').not.toContain(
      'display: none',
    )

    const deleteDate = wrapper.findAll('button').find(b => b.text().includes('删除出生日期'))
    await deleteDate!.trigger('click')
    expect(wrapper.emitted('delete-date')).toHaveLength(1)

    const deleteProfile = wrapper.findAll('button').find(b => b.text().includes('删除整份档案'))
    await deleteProfile!.trigger('click')
    expect(wrapper.emitted('delete-profile')).toHaveLength(1)
  })

  it('无档案时只说明没有可删除的档案', async () => {
    const wrapper = mount(ProfileDangerZone, {
      props: { hasProfile: false, hasBirthDate: false, busy: false },
    })
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('没有可删除的档案')
    expect(wrapper.findAll('button')).toHaveLength(1)
  })

  it('删除文案不承诺尚未实现的历史能力', async () => {
    const wrapper = mount(ProfileDangerZone, {
      props: { hasProfile: true, hasBirthDate: true, busy: false },
    })
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).not.toContain('历史')
  })
})

describe('ProfileRecordCard', () => {
  it('渲染大字公历、副行与转换详情', async () => {
    const wrapper = mount(ProfileRecordCard, {
      props: {
        solarText: '1990年5月5日',
        noteText: '农历 1990年 四月十一 · 依公历换算',
        conversionVersion: 'lunar-javascript 1.7.7 / self-profile-date-v1',
        confirmedAt: '2026-09-13 10:15',
        rawLabel: '公历（本人主动填写）',
      },
    })
    expect(wrapper.text()).toContain('1990年5月5日')
    expect(wrapper.text()).toContain('农历 1990年 四月十一 · 依公历换算')
    expect(wrapper.text()).toContain('出生日期 · 公历')

    await wrapper.get('summary').trigger('click')
    expect(wrapper.text()).toContain('lunar-javascript 1.7.7 / self-profile-date-v1')
    expect(wrapper.text()).toContain('公历（本人主动填写）')
  })

  it('副行为空时不渲染副行', () => {
    const wrapper = mount(ProfileRecordCard, {
      props: {
        solarText: '1990年5月5日',
        noteText: '',
        conversionVersion: 'v1',
        confirmedAt: '—',
        rawLabel: '公历（本人主动填写）',
      },
    })
    expect(wrapper.find('.record-note').exists()).toBe(false)
  })
})
