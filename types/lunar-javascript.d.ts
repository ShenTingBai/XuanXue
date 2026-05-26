declare module 'lunar-javascript' {
  export class Solar {
    getYear(): number
    getMonth(): number
    getDay(): number
  }
  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    getSolar(): Solar
  }
}
