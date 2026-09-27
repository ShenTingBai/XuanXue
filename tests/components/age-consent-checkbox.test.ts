// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AgeConsentCheckbox from '~/components/tools/AgeConsentCheckbox.vue'

/**
 * 共享年龄声明 checkbox 回归（design-system §4.2b，2026-09-27 收敛）。
 * 断言控件形态与状态语义：只有一个真实 checkbox、完整统一文案、方框 indicator、
 * v-model 双向更新；Tab/Space 键盘语义由原生 input 提供，不在测试中冒充键盘证据。
 */

/** 统一文案单一真源：与八字既有声明逐字一致（两个页面共用，不分叉）。 */
const UNIFIED_AGE_TEXT =
  '我已满十四周岁。未满十四周岁时不提供个人出生日期的排盘计算，但仍可阅读本页的规则与来源说明。'

function mountCheckbox(modelValue = false) {
  return mount(AgeConsentCheckbox, { props: { modelValue } })
}

describe('AgeConsentCheckbox 共享年龄声明', () => {
  it('只有一个真实 checkbox（sr-only input），不退化为 radio；通用与历史钩子同在 input 上', () => {
    const wrapper = mountCheckbox()
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(1)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
    expect(wrapper.find('input[data-age-confirmation]').exists()).toBe(true)
    // 八字历史钩子 data-bazi-age 保留在同一个真实 input 上（bazi-page.test.ts 依赖）
    expect(wrapper.find('input[data-bazi-age]').exists()).toBe(true)
  })

  it('文案为两页统一长文案，方框 indicator 与块级变体齐备', () => {
    const wrapper = mountCheckbox()
    expect(wrapper.text()).toContain(UNIFIED_AGE_TEXT)
    expect(wrapper.find('.choice-control__indicator--box').exists()).toBe(true)
    expect(wrapper.find('label.choice-control--block').exists()).toBe(true)
  })

  it('v-model：勾选发出 update:modelValue=true，取消发出 false', async () => {
    const wrapper = mountCheckbox()
    const input = wrapper.find('input')
    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])
    await input.setValue(false)
    expect(wrapper.emitted('update:modelValue')![1]).toEqual([false])
  })

  it('父级状态为 true 时 input checked 同步（受控回写，不做内部副本）', () => {
    const wrapper = mountCheckbox(true)
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
  })
})
