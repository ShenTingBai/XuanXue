declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
    static fromJulianDay(julianDay: number): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
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
