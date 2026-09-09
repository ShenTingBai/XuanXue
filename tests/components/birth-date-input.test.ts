// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BirthDateInput from '~/components/tools/BirthDateInput.vue'

/**
 * BirthDateInput 输入组件用例（契约 §6.2、实施映射第 8 节）。
 *
 * 覆盖空值、年月日回传、非法日期错误关联与键盘标签可达。
 * 本文件只编写、不运行；不写仅镜像模板的断言。
 */

describe('BirthDateInput', () => {
  it('初始三个输入均空，不预填今天/示例', () => {
    const wrapper = mount(BirthDateInput, {
      props: { year: '', month: '', day: '' },
    })
    const inputs = wrapper.findAll('input')
    expect(inputs).toHaveLength(3)
    expect(inputs.map(i => (i.element as HTMLInputElement).value)).toEqual(['', '', ''])
    expect(wrapper.find('legend').text()).toContain('公历出生日期')
  })

  it('年月日输入向父组件回传更新', async () => {
    const wrapper = mount(BirthDateInput, {
      props: { year: '1990', month: '', day: '' },
    })
    const [year, month, day] = wrapper.findAll('input')

    await year.trigger('input') // 已填 1990，不重复
    await month.setValue('6')
    await day.setValue('15')

    const emittedMonth = wrapper.emitted('update:month')
    const emittedDay = wrapper.emitted('update:day')
    expect(emittedMonth).toBeTruthy()
    expect(emittedDay).toBeTruthy()
    expect(emittedMonth?.[0]).toEqual(['6'])
    expect(emittedDay?.[0]).toEqual(['15'])
  })

  it('每个输入都有可见 label 与 for/id 关联', () => {
    const wrapper = mount(BirthDateInput, {
      props: { year: '', month: '', day: '' },
    })
    const labels = wrapper.findAll('label')
    const inputs = wrapper.findAll('input')
    expect(labels).toHaveLength(3)
    labels.forEach((label, i) => {
      const input = inputs[i]
      const forId = label.attributes('for')
      expect(forId).toBeTruthy()
      expect(input.attributes('id')).toBe(forId)
    })
  })

  it('传入错误时通过 aria-describedby 关联错误文案', () => {
    const wrapper = mount(BirthDateInput, {
      props: { year: '2023', month: '2', day: '29', error: '请输入真实存在的公历日期' },
    })
    const error = wrapper.find('[role="alert"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('请输入真实存在的公历日期')
    const errorId = error.attributes('id')
    expect(errorId).toBeTruthy()
    wrapper.findAll('input').forEach(input => {
      expect(input.attributes('aria-describedby')).toBe(errorId)
    })
  })

  it('真实闰日与非法日期由父组件校验，本组件仅透传输入', async () => {
    // 组件本身不校验日期合法性（由父组件按 asOfDate 与公历规则判定），
    // 但应正确把用户输入原样回传，不自动纠正。
    const wrapper = mount(BirthDateInput, {
      props: { year: '2024', month: '2', day: '29' },
    })
    const day = wrapper.findAll('input')[2]
    await day.setValue('30')
    const emitted = wrapper.emitted('update:day')
    expect(emitted?.[0]).toEqual(['30'])
  })
})
