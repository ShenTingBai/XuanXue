declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
    static fromJulianDay(julianDay: number): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    /** 时刻按北京时间返回（R5 节气边界时刻需要）。 */
    getHour(): number
    getMinute(): number
    getSecond(): number
    getLunar(): Lunar
  }
  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    getSolar(): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getYearInGanZhi(): string
    getYearGan(): string
    getYearZhi(): string
    getYearShengXiao(): string
    getMonthInGanZhi(): string
    getMonthGan(): string
    getMonthZhi(): string
    getDayInGanZhi(): string
    getDayGan(): string
    getDayZhi(): string
    getTimeInGanZhi(): string
    getMonthInChinese(): string
    getDayInChinese(): string
    getZhiXing(): string
    getXiu(): string
    getDayYi(): string[]
    getDayJi(): string[]
    getDayTianShen(): string
    getDayTianShenType(): string
    /**
     * 节气表：键含中文节气名与相邻年份的全大写别名（如 大雪 与 DA_XUE 分属相邻年份）。
     * 中文名键覆盖「上一年的冬至 → 本年的冬至…大雪」窗口；取值必须按目标年份显式筛选，
     * 不得按 key 存在性取用（R5 规则台账 R-BZ-004 的已知陷阱）。
     */
    getJieQiTable(): Record<string, Solar>
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear
    getYear(): number
    getMonthsInYear(): LunarMonth[]
    getDayCount(): number
  }

  export class LunarMonth {
    getYear(): number
    /** 负数表示闰月 */
    getMonth(): number
    isLeap(): boolean
    getDayCount(): number
    /** 该月首日的儒略日数（经 Solar.fromJulianDay 转公历） */
    getFirstJulianDay(): number
  }
}
