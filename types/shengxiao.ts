/**
 * 生肖领域成功结果契约（生肖与星座工具契约 §9.3、规则台账 §4）。
 *
 * 全部日期字段以纯日期字符串 YYYY-MM-DD 表达，不经 UTC Date 中间转换
 * （治理规范 §8.1）；生肖年界按中国农历正月初一（规则台账 §1）。
 *
 * @author LiXinwen
 */

export interface YearBoundary {
  startDate: string
  endDate: string
  /** 纯日期口径按中国农历（Asia/Shanghai 民用时钟日期）。 */
  timezone: 'Asia/Shanghai'
}

export interface ShengXiaoResult {
  phase: 'success'
  successQualifier: 'unique'
  freshness: 'current'
  /** 用户输入公历日期（YYYY-MM-DD）。 */
  inputDate: string
  /** 换算农历日期，如「庚子年十一月十一」。 */
  lunarDate: string
  /** 农历年号（如 2026）。 */
  lunarYear: number
  /** 干支年（如「丙午」）。 */
  ganZhiYear: string
  /** 生肖动物（如「马」）。 */
  animal: string
  /** 对应地支（如「午」）。 */
  earthlyBranch: string
  /** 年干五行（传统分类，SRC-006）。 */
  stemElement: string
  /** 年支五行（传统分类，SRC-007）。 */
  branchElement: string
  /** 年干阴阳（传统分类，SRC-006）。 */
  yinYang: string
  /** 六十甲子纳音取象（传统分类，SRC-005）。 */
  naYin: string
  /** 该生肖农历年的公历起止日期。 */
  yearBoundary: YearBoundary
  /** 规则版本（规则台账，`2026-09-09`）。 */
  ruleVersion: string
  /** 候选引擎标识（lunar-javascript 1.7.7）。 */
  engineVersion: string
  /** 来源引用（sourceId，可含定位片段如 SRC-002#T2026c）。 */
  sourceRefs: string[]
}

/** 生肖领域失败结果（仅当 phase = failure）。 */
export interface ShengXiaoFailure {
  phase: 'failure'
  failureCategory: 'invalid_input' | 'unsupported_input' | 'engine_error'
  /** 领域详细代码，如 UNSUPPORTED_DATE。 */
  failureDetailCode?: string
}

/**
 * 公历→农历换算适配器接口。
 * 仅此适配层可引用第三方历法库；领域引擎通过注入实现可测试与失败注入。
 */
export interface CalendarAdapter {
  /** 换算农历日期。输入为纯日期字段。 */
  toLunar(year: number, month: number, day: number): LunarDateInfo
  /** 农历年 Y 的公历起止（正月初一至次年正月初一前一天）。 */
  yearBoundary(lunarYear: number): YearBoundary
}

/** 适配器返回的农历信息（领域内部结构，非展示契约）。 */
export interface LunarDateInfo {
  lunarYear: number
  lunarMonth: number
  /** 负数表示闰月。 */
  lunarDay: number
  /** 干支年（按正月初一年界）。 */
  ganZhiYear: string
  /** 干支年天干。 */
  yearGan: string
  /** 干支年地支。 */
  yearZhi: string
  /** 公历日期（YYYY-MM-DD）。 */
  solarDate: string
}
