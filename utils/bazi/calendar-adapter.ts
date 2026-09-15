/**
 * 八字历法适配器：`utils/bazi` 下**唯一**引用第三方历法库的文件。
 *
 * 契约 §11 要求页面与组件不得直接调用历法库，统一经项目领域适配器；本文件即该边界。
 *
 * 口径与陷阱（证据见 bazi-rule-ledger.md R-BZ-004）：
 * - 输出时刻一律为北京时间（UTC+8），与国标 §3.16「东经 120° 标准时」一致；
 * - `getJieQiTable()` 的同名节气存在**两个 key**：中文名与全大写别名分属相邻年份
 *   （实测 2000-08-07 视角：大雪 = 2000-12-07 而 DA_XUE = 1999-12-07）。因此本适配器
 *   **只按中文名 key 收集候选，再用目标公历年份筛选**，绝不按 key 存在性取用；
 * - 依赖库是实现工具而非规则权威（契约 §24）：其输出不得作为黄金样例期望值来源。
 *
 * 边界：不读时钟、不访问网络或存储、不记录用户输入值；异常一律包装为
 * `BaziAdapterError`（不携带原始异常文本），由领域引擎映射为 engine_error。
 *
 * @author LiXinwen
 */

import { Lunar, LunarYear, Solar } from 'lunar-javascript'
import { JIE_NAMES, type JieName } from '~/constants/bazi-rules'
import type { BaziCalendarAdapter, BaziJieInstants, BaziLunarDate } from '~/types/bazi'
import { parseDateString, toIsoDate } from '~/utils/shengxiao/date'

/** 适配器内部失败（依赖库异常或数据不符合预期），对外只暴露固定名称。 */
export class BaziAdapterError extends Error {
  constructor() {
    super('bazi calendar adapter failed')
    this.name = 'BaziAdapterError'
  }
}

/** 十二"节"名称集合，用于从节气表中筛出本领域关心的条目（过滤全大写别名）。 */
const JIE_NAME_SET: ReadonlySet<string> = new Set<string>(JIE_NAMES)

/**
 * 采集节气表所用的观测日（月, 日）。
 * 单个观测日的表覆盖"上一年冬至 → 本年大雪"的窗口，多取几个观测日可避免
 * 因窗口边界差异漏取某一年的节气；最终仍以目标公历年份筛选为准。
 */
const PROBE_DAYS: ReadonlyArray<readonly [number, number]> = [
  [1, 15],
  [2, 15],
  [7, 15],
  [11, 15],
]

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 边界所在日历日（北京时间）；由依赖库的秒级时刻直接得出，不做取整。 */
function formatDate(solar: Solar): string {
  return toIsoDate(solar.getYear(), solar.getMonth(), solar.getDay())
}

/**
 * 边界时刻（北京时间，分钟精度）。
 *
 * 依赖库给出秒级时刻，而本项目对外的精度声明是**分钟**，且 A 级来源（日本国立天文台）
 * 也是按分钟四舍五入发布的，因此这里同样**四舍五入到分**，使展示与引用来源口径一致
 * （截断会让约一半的节比来源少 1 分钟）。
 *
 * 防跨日：若四舍五入会把时刻推到相邻日历日，则改为向下取整，保证"时刻"与
 * "日历日"始终自洽（否则 23:59:40 会显示为次日 00:00，而边界实际落在当日）。
 * 该情形在 1901—2026 支持区间内**未出现**：扫描 1512 个节，最接近午夜的一次是
 * 1911 年立夏 00:00:18（仍取整为同日 00:00）。
 */
function formatInstant(solar: Solar): string {
  const base = solar.getHour() * 60 + solar.getMinute()
  const rounded = base + (solar.getSecond() >= 30 ? 1 : 0)
  const crossedDay = Math.floor(rounded / 60) !== solar.getHour()
  const minutes = crossedDay ? base : rounded
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${formatDate(solar)} ${pad2(hour)}:${pad2(minute)}`
}

/**
 * 取目标公历年十二个"节"的时刻与日历日。
 *
 * 每个"节"在每个公历年中恰好出现一次；若筛选后不是恰好一条，说明依赖库的
 * 数据不符合预期，直接抛错而不是回退到相邻年份（契约 §26：不得回退默认值）。
 */
function jieInstants(year: number): BaziJieInstants {
  const candidates = new Map<JieName, Array<{ instant: string; date: string }>>()

  for (const [month, day] of PROBE_DAYS) {
    const table = Solar.fromYmd(year, month, day).getLunar().getJieQiTable()
    for (const [key, solar] of Object.entries(table)) {
      if (!JIE_NAME_SET.has(key)) continue
      const name = key as JieName
      const entry = { instant: formatInstant(solar), date: formatDate(solar) }
      const list = candidates.get(name)
      if (list) {
        if (!list.some(item => item.instant === entry.instant)) list.push(entry)
      } else {
        candidates.set(name, [entry])
      }
    }
  }

  const prefix = `${year}-`
  const result = {} as BaziJieInstants
  for (const name of JIE_NAMES) {
    const matched = (candidates.get(name) ?? []).filter(item => item.date.startsWith(prefix))
    if (matched.length !== 1) throw new BaziAdapterError()
    result[name] = matched[0]
  }
  return result
}

/** 公历 → 农历（月号取绝对值，闰月状态独立表达）。 */
function solarToLunar(year: number, month: number, day: number): BaziLunarDate {
  const lunar = Solar.fromYmd(year, month, day).getLunar()
  const rawMonth = lunar.getMonth()
  return {
    year: lunar.getYear(),
    month: Math.abs(rawMonth),
    day: lunar.getDay(),
    isLeapMonth: rawMonth < 0,
  }
}

/**
 * 该农历日期是否存在（月含闰月、日不越界）。
 * 用 LunarYear 的真实月份表核验，不存在的闰月或越界日返回 false，
 * 供领域引擎把它判为 invalid_input（与依赖库异常区分）。
 */
function isValidLunarDate(year: number, month: number, day: number, isLeapMonth: boolean): boolean {
  if (month < 1 || month > 12 || day < 1) return false
  const monthTarget = isLeapMonth ? -month : month
  const months = LunarYear.fromYear(year).getMonthsInYear()
  const matched = months.find(item => item.getYear() === year && item.getMonth() === monthTarget)
  if (!matched) return false
  return day <= matched.getDayCount()
}

/**
 * 农历 → 公历（YYYY-MM-DD）。
 *
 * 调用前须已通过 isValidLunarDate；本函数仍会再核验一次，并在转换后
 * round-trip 核对原始农历年月日，发生滚动即视为不可用（抛错，不静默接受）。
 */
function lunarToSolar(year: number, month: number, day: number, isLeapMonth: boolean): string {
  if (!isValidLunarDate(year, month, day, isLeapMonth)) throw new BaziAdapterError()
  const monthTarget = isLeapMonth ? -month : month

  const solar = Lunar.fromYmd(year, monthTarget, day).getSolar()
  const back = solar.getLunar()
  if (back.getYear() !== year || back.getMonth() !== monthTarget || back.getDay() !== day) {
    throw new BaziAdapterError()
  }
  return toIsoDate(solar.getYear(), solar.getMonth(), solar.getDay())
}

/** 六十甲子日（民用午夜换日）。 */
function dayGanZhi(solarDate: string): string {
  const parsed = parseDateString(solarDate)
  if (!parsed) throw new BaziAdapterError()
  return Solar.fromYmd(parsed.year, parsed.month, parsed.day).getLunar().getDayInGanZhi()
}

/** 把依赖库异常统一包装为 BaziAdapterError，避免泄露原始异常文本。 */
function guard<T>(operation: () => T): T {
  try {
    return operation()
  } catch {
    throw new BaziAdapterError()
  }
}

/** 生产适配器：领域引擎的默认注入实现。 */
export const baziCalendarAdapter: BaziCalendarAdapter = {
  jieInstants: year => guard(() => jieInstants(year)),
  solarToLunar: (year, month, day) => guard(() => solarToLunar(year, month, day)),
  isValidLunarDate: (year, month, day, isLeapMonth) =>
    guard(() => isValidLunarDate(year, month, day, isLeapMonth)),
  lunarToSolar: (year, month, day, isLeapMonth) =>
    guard(() => lunarToSolar(year, month, day, isLeapMonth)),
  dayGanZhi: solarDate => guard(() => dayGanZhi(solarDate)),
}
