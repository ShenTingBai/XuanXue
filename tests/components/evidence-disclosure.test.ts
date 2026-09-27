// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EvidenceDisclosure from '~/components/editorial/EvidenceDisclosure.vue'

/**
 * 共享依据折叠壳回归（design-system §4.2b，2026-09-27 收敛）。
 * 只测壳本身：默认关闭、摘要双标签、aria 关系、点击切换、mark-class 钩子与
 * slot 挂载；业务来源数据由各页面测试承载，不在此断言。
 */

const ContentStub = { template: '<p data-disclosure-content>展开内容</p>' }

function mountDisclosure(extraProps: Record<string, unknown> = {}) {
  return mount(EvidenceDisclosure, {
    props: {
      closedLabel: '展开：来源与限制',
      openLabel: '收起：来源与限制',
      contentId: 'disclosure-content-test',
      ...extraProps,
    },
    slots: { default: ContentStub },
  })
}

describe('EvidenceDisclosure 共享折叠壳', () => {
  it('默认收起：details 无 open 属性，内容仍在 DOM（details 语义不卸载内容）', () => {
    const wrapper = mountDisclosure()
    const details = wrapper.find('details')
    expect(details.attributes('open')).toBeUndefined()
    expect(details.findAll('summary')).toHaveLength(1)
    expect(wrapper.find('[data-disclosure-content]').exists()).toBe(true)
    // 双标签同时渲染，收起态显示哪条由 CSS details[open] 决定
    expect(wrapper.text()).toContain('展开：来源与限制')
    expect(wrapper.text()).toContain('收起：来源与限制')
  })

  it('summary 同步 aria-expanded=false，aria-controls 指向 content-id 容器', () => {
    const wrapper = mountDisclosure()
    const summary = wrapper.find('summary')
    expect(summary.attributes('aria-expanded')).toBe('false')
    expect(summary.attributes('aria-controls')).toBe('disclosure-content-test')
    expect(wrapper.find('#disclosure-content-test').exists()).toBe(true)
  })

  it('受控 open=true 时 aria-expanded 同步为 true 且 details 携带 open', () => {
    const wrapper = mountDisclosure({ open: true })
    expect(wrapper.find('summary').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('details').attributes('open')).toBeDefined()
  })

  it('点击 summary 走原生 details 切换，并以 update:open 通知父级', async () => {
    const wrapper = mountDisclosure()
    await wrapper.find('summary').trigger('click')
    // 原生行为：DOM open 已切换；组件经 toggle 事件把新状态交给受控父级
    expect((wrapper.find('details').element as HTMLDetailsElement).open).toBe(true)
    expect(wrapper.emitted('update:open')).toEqual([[true]])
  })

  it('mark-class 附加到 ＋/－ 标记（八字 bazi-fold-mark 钩子兼容），默认不追加', () => {
    const withMark = mountDisclosure({ markClass: 'bazi-fold-mark' })
    expect(withMark.find('.evidence-disclosure__mark').classes()).toContain('bazi-fold-mark')
    const withoutMark = mountDisclosure()
    expect(withoutMark.find('.evidence-disclosure__mark').classes()).not.toContain('bazi-fold-mark')
  })

  it('slot 内容挂载在 content-id 容器内（aria-controls 的目标承载内容）', () => {
    const wrapper = mountDisclosure()
    expect(wrapper.find('#disclosure-content-test [data-disclosure-content]').exists()).toBe(true)
  })
})
