declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar
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
    getMonthInGanZhi(): string
    getDayInGanZhi(): string
    getTimeInGanZhi(): string
    getMonthInChinese(): string
    getDayInChinese(): string
    getDayTwelveStar(): string
    getXiu(): string
    getDayYi(): string[]
    getDayJi(): string[]
    getDayTianShen(): string
    getDayTianShenType(): string
  }
}
