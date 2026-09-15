import { describe, expect, it } from 'vitest'
import {
  BAZI_CONTENT_LABELS,
  BAZI_DAY_PILLAR_ANCHOR,
  BAZI_ENGINE_NAME,
  BAZI_ENGINE_VERSION,
  BAZI_ERROR_CODES,
  BAZI_FAILURE_REASONS,
  BAZI_GAN_ELEMENT,
  BAZI_GAN_YINYANG,
  BAZI_JIE,
  BAZI_LIMITATIONS,
  BAZI_NEAR_MIDNIGHT_MINUTES,
  BAZI_NOT_OUTPUT,
  BAZI_RULE_VERSION,
  BAZI_SOURCE_SET_VERSION,
  BAZI_SUPPORT_START,
  BAZI_TIMEZONE,
  BAZI_WUHU,
  BAZI_YEAR_CYCLE_ANCHOR,
  BAZI_ZHI_ELEMENT,
  JIE_NAMES,
} from '~/constants/bazi-rules'
import { WUXING_BRANCH, WUXING_STEM } from '~/constants/bazi'

/**
 * 八字规则常量层：十二「节」与黄经、五虎遁古歌、未输出清单、限制说明与版本。
 *
 * 期望值来源：GB/T 33661—2017 规范性附录 A 表 A.1（黄经与「节」的对应）与 §6.1.1/§6.3.2
 * （两个锚点）、§5.2（精度要求）、《三命通会》卷二·论遁月时古歌（五虎遁）、
 * 交付规范 §7.1（闭集）、D11（依赖精确锁定）。本文件是常量层的独立期望，不引用实现自证。
 */

describe('十二「节」与黄经', () => {
  it('节名与次序固定（立春起，按月序），且不使用中气', () => {
    expect(JIE_NAMES).toEqual([
      '立春',
      '惊蛰',
      '清明',
      '立夏',
      '芒种',
      '小暑',
      '立秋',
      '白露',
      '寒露',
      '立冬',
      '大雪',
      '小寒',
    ])
    expect(BAZI_JIE.map(item => item.name)).toEqual([...JIE_NAMES])
    for (const excluded of ['雨水', '春分', '谷雨', '小满', '夏至', '大暑']) {
      expect(BAZI_JIE.some(item => item.name === (excluded as never))).toBe(false)
    }
  })

  it('黄经与月支逐条等于国家标准附录 A 的规范值', () => {
    const normative: Array<[string, number, string]> = [
      ['立春', 315, '寅'],
      ['惊蛰', 345, '卯'],
      ['清明', 15, '辰'],
      ['立夏', 45, '巳'],
      ['芒种', 75, '午'],
      ['小暑', 105, '未'],
      ['立秋', 135, '申'],
      ['白露', 165, '酉'],
      ['寒露', 195, '戌'],
      ['立冬', 225, '亥'],
      ['大雪', 255, '子'],
      ['小寒', 285, '丑'],
    ]
    expect(BAZI_JIE.map(item => [item.name, item.longitude, item.branch])).toEqual(normative)
    // 黄经按 30° 等差推进（跨 360° 回绕）。
    for (let index = 1; index < BAZI_JIE.length; index++) {
      const delta = (BAZI_JIE[index]!.longitude - BAZI_JIE[index - 1]!.longitude + 360) % 360
      expect(delta, BAZI_JIE[index]!.name).toBe(30)
    }
  })
})

describe('五虎遁与干支五行', () => {
  it('五虎遁与古歌逐句一致（甲己丙、乙庚戊、丙辛庚、丁壬壬、戊癸甲）', () => {
    expect(BAZI_WUHU).toEqual({
      甲: '丙',
      己: '丙',
      乙: '戊',
      庚: '戊',
      丙: '庚',
      辛: '庚',
      丁: '壬',
      壬: '壬',
      戊: '甲',
      癸: '甲',
    })
  })

  it('干支五行与阴阳复用唯一数据源，不在本文件重定义', () => {
    expect(BAZI_GAN_ELEMENT).toBe(WUXING_STEM)
    expect(BAZI_ZHI_ELEMENT).toBe(WUXING_BRANCH)
    expect(BAZI_GAN_YINYANG).toEqual({
      甲: '阳',
      乙: '阴',
      丙: '阳',
      丁: '阴',
      戊: '阳',
      己: '阴',
      庚: '阳',
      辛: '阴',
      壬: '阳',
      癸: '阴',
    })
  })
})

describe('范围、版本与锚点', () => {
  it('支持范围、时间口径与两个 A 级锚点为既定常量', () => {
    expect(BAZI_SUPPORT_START).toBe('1901-01-01')
    expect(BAZI_TIMEZONE).toBe('Asia/Shanghai')
    expect(BAZI_DAY_PILLAR_ANCHOR).toBe('1949-10-01')
    expect(BAZI_YEAR_CYCLE_ANCHOR).toBe(1984)
    expect(BAZI_NEAR_MIDNIGHT_MINUTES).toBe(5)
  })

  it('规则版本与来源集合版本同值；引擎为精确锁定的实现工具版本', () => {
    expect(BAZI_RULE_VERSION).toBe('2026-09-14-bazi-date-v1')
    expect(BAZI_SOURCE_SET_VERSION).toBe(BAZI_RULE_VERSION)
    expect(BAZI_ENGINE_NAME).toBe('lunar-javascript')
    expect(BAZI_ENGINE_VERSION).toBe('1.7.7')
  })

  it('未输出清单完整覆盖契约闭集，且不含任何可输出的正常能力', () => {
    const required = [
      '时柱',
      '大运',
      '流年',
      '流月',
      '神煞',
      '日主强弱',
      '喜用神',
      '忌神',
      '评分',
      '性格判断',
      '现实预测',
      '胎元',
      '命宫',
      '身宫',
    ]
    for (const item of required) {
      expect(BAZI_NOT_OUTPUT, item).toContain(item)
    }
    expect(BAZI_NOT_OUTPUT).toHaveLength(required.length)
  })

  it('限制说明逐条保留精度与证据等级声明', () => {
    const joined = BAZI_LIMITATIONS.join('\n')
    expect(joined).toContain('不生成时柱')
    expect(joined).toContain('23:00—23:59')
    expect(joined).toContain('1 秒级精度尚未核验')
    expect(joined).toContain('原刻影印核对尚未完成')
    expect(joined).toContain('1901-01-01')
    // 不得把年柱口径写成国家标准规定。
    expect(joined).not.toContain('国家标准规定')
  })

  it('内容标签只使用治理规范 §5.6 的两类', () => {
    expect(BAZI_CONTENT_LABELS).toEqual(['计算结果', '项目整理'])
  })

  it('失败原因文案覆盖全部面向用户的失败码，且不含预测或评价', () => {
    for (const code of [
      BAZI_ERROR_CODES.INVALID_DATE,
      BAZI_ERROR_CODES.FUTURE_DATE,
      BAZI_ERROR_CODES.UNSUPPORTED_DATE,
      BAZI_ERROR_CODES.INVALID_LUNAR_DATE,
      BAZI_ERROR_CODES.ENGINE_ERROR,
    ]) {
      expect(BAZI_FAILURE_REASONS[code], code).toBeTruthy()
    }
    for (const text of Object.values(BAZI_FAILURE_REASONS)) {
      expect(text).not.toMatch(/吉凶|运势|评分|预测/)
    }
  })
})
