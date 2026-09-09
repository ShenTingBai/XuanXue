/**
 * 生肖来源引用常量（与来源台账同步）。
 *
 * 来源台账：docs/product/evidence/shengxiao/shengxiao-source-ledger.md。
 * 状态枚举：sourceStatus ∈ {verified_primary, verified_secondary, implementation_only,
 * disputed, unverified, no_source}；sourceReviewStatus ∈ {unreviewed, in_review, approved, rejected}。
 *
 * 仅采用已通过实施前审阅的限定主张；候选引擎标 implementation_only；
 * 不夹入未经核验的地支关系（R-SX-007）与文化形象（BLK-006）。
 *
 * @author LiXinwen
 */

export interface ShengXiaoSourceRecord {
  sourceId: string
  title: string
  organization: string
  /** 版本或年代。 */
  version: string
  /** 具体位置（卷/章/页/网页小节）。 */
  locator: string
  link: string
  sourceStatus:
    | 'verified_primary'
    | 'verified_secondary'
    | 'implementation_only'
    | 'disputed'
    | 'unverified'
    | 'no_source'
  sourceReviewStatus: 'unreviewed' | 'in_review' | 'approved' | 'rejected'
  /** 该来源支持的 ruleId。 */
  supportedRules: string[]
}

/** 可展示/引用的来源记录表，键为纯净 sourceId（可含定位片段，见 HKO_T_INDEX）。 */
export const SHENGXIAO_SOURCES: Readonly<Record<string, ShengXiaoSourceRecord>> = {
  'SRC-001': {
    sourceId: 'SRC-001',
    title: '《农历的编算和颁行》GB/T 33661—2017',
    organization: '国家质量监督检验检疫总局、中国国家标准化管理委员会',
    version: '2017-05-12 发布，2017-09-01 实施',
    locator: '3.16/3.17、3.21/3.22、4.1—4.5、6.1.1/6.1.2（扫描页已目视核对）',
    link: 'https://std.samr.gov.cn/gb/search/gbDetailed?id=n4aXcLrEnvA%3D&mode=p',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-001', 'R-SX-003'],
  },
  'SRC-002': {
    sourceId: 'SRC-002',
    title: '公历与农历日期对照表（1901–2100）',
    organization: '中国香港天文台',
    version: '持续更新（访问日期 2026-09-09）',
    locator: '页面主体：年份链接列表；逐年 PDF/文本对照表',
    link: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-001', 'R-SX-002', 'R-SX-003'],
  },
  'SRC-002a': {
    sourceId: 'SRC-002a',
    title: '今夕是何年？（农历年、干支纪年与岁首）',
    organization: '中国香港天文台（作者 许大伟）',
    version: '2018年4月',
    locator: '页面主体说明段（正月初一为干支交替时刻）',
    link: 'https://www.hko.gov.hk/sc/education/astronomy-and-time/time-service/00506-what-year-is-it-today.html',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-001'],
  },
  'SRC-003': {
    sourceId: 'SRC-003',
    title: '重编国语辞典修订本——「生肖」词条',
    organization: '台湾教育部',
    version: '在线版（访问日期 2026-09-09）',
    locator: '词条正文：十二种动物配十二地支',
    link: 'https://dict.revised.moe.edu.tw/dictView.jsp?ID=132439&q=1&word=生肖',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-006'],
  },
  'SRC-003a': {
    sourceId: 'SRC-003a',
    title: '公历与农历对照表（逐年文本版）——干支纪年表头',
    organization: '中国香港天文台',
    version: '2021–2026',
    locator: '各年表头干支纪年及对应生肖',
    link: 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2026c.txt',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-003', 'R-SX-006'],
  },
  'SRC-004': {
    sourceId: 'SRC-004',
    title: '《三命通会》卷二·论地支属相',
    organization: '万民英（明）；国学梦在线整理版',
    version: '访问日期 2026-09-09',
    locator: '卷二·论地支属相正文（转录页作「戍属犬」，展示地支以教育部辞典「戌」为依据）',
    link: 'https://www.guoxuemeng.com/guoxue/548891.html',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-006'],
  },
  'SRC-005': {
    sourceId: 'SRC-005',
    title: '《三命通会》卷一·论纳音取象',
    organization: '万民英（明）；国学梦在线整理版',
    version: '访问日期 2026-09-09',
    locator: '卷一·论纳音取象正文（完整三十种纳音取象名）',
    link: 'https://www.guoxuemeng.com/guoxue/548866.html',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-005'],
  },
  'SRC-005a': {
    sourceId: 'SRC-005a',
    title: '《三命通会》卷一·总论纳音 / 释六十甲子性质吉凶',
    organization: '万民英（明）；国学梦在线整理版',
    version: '访问日期 2026-09-09',
    locator: '卷一「总论纳音」（548865.html）、「释六十甲子性质吉凶」（548867.html）',
    link: 'https://www.guoxuemeng.com/guoxue/548865.html',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'in_review',
    supportedRules: ['R-SX-005'],
  },
  'SRC-006': {
    sourceId: 'SRC-006',
    title: '《三命通会》卷二·论天干阴阳生死',
    organization: '万民英（明）；国学梦在线整理版',
    version: '访问日期 2026-09-09',
    locator: '卷二·论天干阴阳生死正文（十干五阳五阴）',
    link: 'https://www.guoxuemeng.com/guoxue/548879.html',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-004'],
  },
  'SRC-007': {
    sourceId: 'SRC-007',
    title: '《五行大义》卷二·第五论配支干（电子转录）',
    organization: '萧吉（隋）；miko.org 网络转录',
    version: '转录本（访问日期 2026-09-09）',
    locator: '正文第3段五行与地支分组；卷次依同站书目内文概要区分，未核验印刷底本',
    link: 'https://miko.org/~uraki/kuon/furu/explain/meisi/onmyouji/onmyoudou/five/daigi05.htm',
    sourceStatus: 'verified_secondary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-004'],
  },
  'SRC-008': {
    sourceId: 'SRC-008',
    title: 'FRUS 1900，Document 86（Mr. Conger to Mr. Hay.）',
    organization: 'E. H. Conger；美国国务院历史办公室托管',
    version: '1900-01-29，公文编号 315，印刷第 92 页',
    locator: '文首发文日期与第 92 页春节为当月 31 日的说明',
    link: 'https://history.state.gov/historicaldocuments/frus1900/d86',
    sourceStatus: 'verified_primary',
    sourceReviewStatus: 'approved',
    supportedRules: ['R-SX-001'],
  },
  'SRC-LUNAR': {
    sourceId: 'SRC-LUNAR',
    title: 'lunar-javascript',
    organization: '6tail（开源社区）',
    version: '1.7.7（MIT）',
    locator: 'Solar.fromYmd().getLunar()、getYearInGanZhi() 等',
    link: 'https://www.npmjs.com/package/lunar-javascript',
    sourceStatus: 'implementation_only',
    sourceReviewStatus: 'in_review',
    supportedRules: ['R-SX-002', 'R-SX-003'],
  },
}

/**
 * HKO 逐年文本版定位索引（来源台账「春节公历日期核验记录与定位索引」）。
 * 键为可解析片段 `SRC-002#T{年}c`，值为实际完整 URL。
 */
export const HKO_YEAR_TEXT_URL: Readonly<Record<string, string>> = {
  'SRC-002#T1901c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T1901c.txt',
  'SRC-002#T1902c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T1902c.txt',
  'SRC-002#T1903c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T1903c.txt',
  'SRC-002#T2022c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2022c.txt',
  'SRC-002#T2023c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2023c.txt',
  'SRC-002#T2024c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2024c.txt',
  'SRC-002#T2025c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2025c.txt',
  'SRC-002#T2026c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2026c.txt',
  'SRC-002#T2027c': 'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2027c.txt',
}

/** 定位片段（如 `SRC-002#T2026c`）→ 完整 URL，供页面展示来源链接。 */
export function resolveSourceLink(ref: string): string {
  if (ref in HKO_YEAR_TEXT_URL) {
    return HKO_YEAR_TEXT_URL[ref]
  }
  const base = ref.split('#')[0]
  return SHENGXIAO_SOURCES[base]?.link ?? ''
}

/** 来源标题（供页面「依据与范围」展示）。 */
export function resolveSourceTitle(ref: string): string {
  if (ref in HKO_YEAR_TEXT_URL) {
    return `中国香港天文台《${ref.split('#')[1]}.txt》逐年对照表`
  }
  const base = ref.split('#')[0]
  return SHENGXIAO_SOURCES[base]?.title ?? ref
}
