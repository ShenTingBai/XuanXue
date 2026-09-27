// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaziExportCards from '~/components/bazi/BaziExportCards.vue'

/**
 * 八字双轨导出卡组件：字段白名单由 props 驱动（契约 §23.3）。
 *
 * 期望值来源：简洁分享卡默认脱敏（§27.5 简洁导出默认隐藏精确出生资料）；
 * 完整自用卡包含传入的完整出生输入但不含账号与档案无关字段；
 * 两种卡片都保留结果状态、规则版本、来源集合版本、计算时间与边界/限制说明。
 * 干支与版本取值本身由黄金样例与页面测试覆盖，此处只断言字段边界与结构。
 */

const baseProps = {
  statusText: '已生成日期级结果：三柱（年、月、日）／共四柱，缺时柱',
  pillars: [
    { label: '年柱', value: '庚辰', note: '金 · 金', isDay: false },
    { label: '月柱', value: '甲申', note: '木 · 金', isDay: false },
    { label: '日柱', value: '戊午', note: '土 · 火', isDay: true, dayMaster: '戊' },
  ],
  birthRows: [
    { label: '你填写的出生日期', value: '公历 2000-08-15' },
    { label: '规范化公历', value: '2000-08-15' },
    { label: '对应农历', value: '2000 年7 月15 日（普通月）' },
  ],
  limitations: [
    '缺时柱：本版只用出生日期，不生成时柱，也不据此推断任何结论。',
    '节气时刻为分钟级核验：边界日的结果对精度敏感。',
  ],
  ruleVersion: '2026-09-14-bazi-date-v1',
  sourceSetVersion: '2026-09-14-bazi-date-v1',
  engineLabel: 'lunar-javascript 1.7.7',
  asOfDate: '2026-09-27',
}

function mountCards() {
  return mount(BaziExportCards, { props: baseProps })
}

describe('八字导出卡字段边界', () => {
  it('简洁分享卡不含出生输入行，也不含账号与档案字段', () => {
    const wrapper = mountCards()
    const simple = wrapper.get('[data-bazi-export-simple]')
    // 精确出生资料（原始表达、规范化公历、农历）由页面扣下，不传给简洁卡。
    expect(simple.text()).not.toContain('2000-08-15')
    expect(simple.text()).not.toContain('对应农历')
    expect(simple.text()).not.toContain('账号')
    expect(simple.text()).not.toContain('昵称')
    expect(simple.text()).not.toContain('档案')
    wrapper.unmount()
  })

  it('完整自用卡包含传入的完整出生输入（原始表达与农历）', () => {
    const wrapper = mountCards()
    const full = wrapper.get('[data-bazi-export-full]')
    expect(full.text()).toContain('公历 2000-08-15')
    expect(full.text()).toContain('2000 年7 月15 日（普通月）')
    // 提示行写明图片包含完整出生日期。
    expect(full.text()).toContain('包含本次填写的完整出生日期')
    wrapper.unmount()
  })

  it('两种卡片都保留状态、版本、引擎、计算时间与边界/限制说明', () => {
    const wrapper = mountCards()
    for (const selector of ['[data-bazi-export-simple]', '[data-bazi-export-full]']) {
      const card = wrapper.get(selector)
      expect(card.text()).toContain('三柱（年、月、日）／共四柱，缺时柱')
      expect(card.text()).toContain('2026-09-14-bazi-date-v1')
      expect(card.text()).toContain('lunar-javascript 1.7.7')
      expect(card.text()).toContain('计算时间')
      expect(card.text()).toContain('2026-09-27')
      expect(card.text()).toContain('缺时柱')
      expect(card.text()).toContain('节气时刻为分钟级核验')
      // 来源只留入口说明，不复制 Ⅴ 段来源清单全文。
      expect(card.text()).toContain('依据与范围')
    }
    wrapper.unmount()
  })

  it('柱行渲染传入的干支与日干，日柱带 --day 修饰', () => {
    const wrapper = mountCards()
    for (const selector of ['[data-bazi-export-simple]', '[data-bazi-export-full]']) {
      const card = wrapper.get(selector)
      expect(card.text()).toContain('庚辰')
      expect(card.text()).toContain('甲申')
      expect(card.text()).toContain('戊午')
      expect(card.text()).toContain('日干 戊')
      const dayPillars = card.findAll('.bazi-export-card__pillar--day')
      expect(dayPillars).toHaveLength(1)
      expect(dayPillars[0]!.text()).toContain('日柱')
    }
    wrapper.unmount()
  })

  it('候选情形：年月组合行按 props 逐条渲染（甲/乙标注由页面传入）', () => {
    const wrapper = mount(BaziExportCards, {
      props: {
        ...baseProps,
        statusText: '该日期跨「节」：年柱与月柱各有 2 种可能，日柱不受影响',
        pillars: [
          { label: '年柱·月柱（甲）', value: '庚辰 / 甲申', note: '立秋前', isDay: false },
          { label: '年柱·月柱（乙）', value: '庚辰 / 乙酉', note: '立秋后', isDay: false },
          { label: '日柱', value: '戊午', note: '土 · 火', isDay: true, dayMaster: '戊' },
        ],
      },
    })
    const simple = wrapper.get('[data-bazi-export-simple]')
    expect(simple.text()).toContain('年柱·月柱（甲）')
    expect(simple.text()).toContain('年柱·月柱（乙）')
    expect(simple.text()).toContain('立秋前')
    expect(simple.text()).toContain('立秋后')
    wrapper.unmount()
  })
})
