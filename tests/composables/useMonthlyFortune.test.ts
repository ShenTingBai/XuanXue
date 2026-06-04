import { describe, it, expect } from 'vitest'
import { calculateMonthlyFortune, type MonthlyFortuneResult } from '../../composables/useMonthlyFortune'

describe('calculateMonthlyFortune', () => {
  /** Helper: find a month by its branch name */
  function findMonth(result: MonthlyFortuneResult, branch: string) {
    return result.months.find(m => m.monthBranch === branch)
  }

  // ── A Rat born in 1996 (子, 水) for year 2026 ──
  it('returns 12 months with all required fields', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    expect(result.months).toHaveLength(12)
    expect(result.year).toBe(2026)
    expect(result.animal).toBe('鼠')
    expect(result.animalBranch).toBe('子')
    expect(result.animalElement).toBe('水')

    for (const month of result.months) {
      expect(month.monthIndex).toBeGreaterThanOrEqual(1)
      expect(month.monthIndex).toBeLessThanOrEqual(12)
      expect(month.monthName).toMatch(/^[寅卯辰巳午未申酉戌亥子丑]月$/)
      expect(month.monthBranch).toMatch(/^[子丑寅卯辰巳午未申酉戌亥]$/)
      expect(month.monthStem).toMatch(/^[甲乙丙丁戊己庚辛壬癸]$/)
      expect(month.gregorianLabel).toContain('—')
      expect(month.score).toBeGreaterThanOrEqual(0)
      expect(month.score).toBeLessThanOrEqual(100)
      expect(['旺', '平', '弱']).toContain(month.level)
      expect(['运势旺盛', '运势平稳', '运势低迷']).toContain(month.levelLabel)
      expect(month.relationship).toBeTruthy()
      expect(month.tip.length).toBeGreaterThan(0)
    }
  })

  // ── 六合 relationship: 子丑合 → Rat (子) should have 六合 with 丑月 ──
  it('detects 六合 and gives a high score + appropriate tip', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    const chou = findMonth(result, '丑')
    expect(chou).toBeDefined()
    expect(chou!.relationship).toBe('六合')
    expect(chou!.score).toBeGreaterThanOrEqual(70)
    expect(chou!.level).toBe('旺')
    expect(chou!.tip).toBe('贵人相助，运势顺畅，宜积极进取')
  })

  // ── 三合 relationship: 申子辰 → Rat (子) with 申月 or 辰月 ──
  it('detects 三合 and gives a good score', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    const shen = findMonth(result, '申')
    const chen = findMonth(result, '辰')
    expect(shen).toBeDefined()
    expect(chen).toBeDefined()

    // At least one of them should be 三合
    const sanHe = [shen!, chen!].filter(m => m.relationship === '三合')
    expect(sanHe.length).toBeGreaterThanOrEqual(1)

    for (const m of sanHe) {
      expect(m.score).toBeGreaterThanOrEqual(55)
      expect(m.tip).toBe('人缘颇佳，合作有利，宜拓展社交')
    }
  })

  // ── 相冲 relationship: 子午冲 → Rat (子) should clash with 午月 ──
  it('detects 相冲 and gives a low score + appropriate tip', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    const wu = findMonth(result, '午')
    expect(wu).toBeDefined()
    expect(wu!.relationship).toBe('相冲')
    expect(wu!.score).toBeLessThanOrEqual(45)
    expect(wu!.level).toBe('弱')
    expect(wu!.tip).toBe('变动较多，宜静不宜动，谨慎应对')
  })

  // ── 相刑 relationship: 子卯刑 ──
  it('detects 相刑 and assigns a penalty', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    const mao = findMonth(result, '卯')
    expect(mao).toBeDefined()
    expect(mao!.relationship).toBe('相刑')
    expect(mao!.score).toBeLessThan(55) // should be penalized
    expect(mao!.tip).toBe('口舌是非易生，注意人际关系')
  })

  // ── 相害 relationship: 子未害 ──
  it('detects 相害 and assigns a penalty', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    const wei = findMonth(result, '未')
    expect(wei).toBeDefined()
    expect(wei!.relationship).toBe('相害')
    expect(wei!.score).toBeLessThan(55)
    expect(wei!.tip).toBe('暗中阻碍，防小人，守成为上')
  })

  // ── 相破 relationship: 子酉破 ──
  it('detects 相破 and assigns a moderate penalty', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    const you = findMonth(result, '酉')
    expect(you).toBeDefined()
    expect(you!.relationship).toBe('相破')
    expect(you!.score).toBeLessThan(55)
    expect(you!.tip).toBe('计划易生变故，细节不可疏忽')
  })

  // ── Level classification thresholds ──
  it('classifies score >= 70 as 旺, < 40 as 弱, else 平', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    for (const month of result.months) {
      if (month.score >= 70) {
        expect(month.level).toBe('旺')
        expect(month.levelLabel).toBe('运势旺盛')
      } else if (month.score < 40) {
        expect(month.level).toBe('弱')
        expect(month.levelLabel).toBe('运势低迷')
      } else {
        expect(month.level).toBe('平')
        expect(month.levelLabel).toBe('运势平稳')
      }
    }
  })

  // ── Different animals produce different results ──
  it('produces different results for different zodiac animals', () => {
    const rat = calculateMonthlyFortune(1996, 2026, '子', '水')
    const ox = calculateMonthlyFortune(1997, 2026, '丑', '土')

    // At least one month should differ in relationship
    const diffCount = rat.months.filter((m, i) => m.relationship !== ox.months[i].relationship)
    expect(diffCount.length).toBeGreaterThan(0)
  })

  // ── All relationships have proper descriptions ──
  it('every month with a special relationship has a non-empty description', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    for (const month of result.months) {
      if (month.relationship !== '无特殊关系') {
        expect(month.relationshipDesc.length).toBeGreaterThan(0)
      } else {
        expect(month.relationshipDesc).toBe('')
      }
    }
  })

  // ── 寅亥合 priority over 寅亥破 ──
  it('寅亥 shows 六合 (not 相破) for 亥年 (Pig) user', () => {
    // A Pig (亥) born in 2007 has earthly branch 亥
    const result = calculateMonthlyFortune(2007, 2026, '亥', '水')
    const yin = findMonth(result, '寅')
    expect(yin).toBeDefined()
    expect(yin!.relationship).toBe('六合')
    expect(yin!.score).toBeGreaterThanOrEqual(70)
  })

  // ── Same year as tiger produces correct data ──
  it('handles Tiger (寅, 木) correctly', () => {
    const result = calculateMonthlyFortune(1998, 2026, '寅', '木')
    expect(result.animal).toBe('虎')
    expect(result.months).toHaveLength(12)

    // Tiger (寅) has 六合 with 亥月
    const hai = findMonth(result, '亥')
    expect(hai).toBeDefined()
    expect(hai!.relationship).toBe('六合')

    // Tiger (寅) has 相冲 with 申月
    const shen = findMonth(result, '申')
    expect(shen).toBeDefined()
    expect(shen!.relationship).toBe('相冲')
  })

  // ── Element-based tips when no special relationship ──
  it('assigns element-based tips for months with no special branch relationship', () => {
    // Snake (巳, 火) born 2001 — 巳 only has special relationships with 寅(刑/害/破), 申(合/刑/破), 亥(冲), etc.
    const result = calculateMonthlyFortune(2001, 2026, '巳', '火')

    // Find months with "无特殊关系" and verify element-based tips
    const neutralMonths = result.months.filter(m => m.relationship === '无特殊关系')
    expect(neutralMonths.length).toBeGreaterThan(0)

    for (const m of neutralMonths) {
      // Element-based tips should NOT be relationship tips
      expect(m.tip).not.toBe('贵人相助，运势顺畅，宜积极进取')
      expect(m.tip).not.toBe('人缘颇佳，合作有利，宜拓展社交')
      expect(m.tip).not.toBe('变动较多，宜静不宜动，谨慎应对')
      expect(m.tip).not.toBe('口舌是非易生，注意人际关系')
      expect(m.tip).not.toBe('暗中阻碍，防小人，守成为上')
      expect(m.tip).not.toBe('计划易生变故，细节不可疏忽')
      // Should be one of the element tips
      expect([
        '月令生扶，精力充沛，顺势而为',
        '付出较多，注意休养，量力而行',
        '压力较大，保持耐心，稳扎稳打',
        '主导局面，主动出击，把握机会',
        '得令当旺，运势平稳，保持节奏',
      ]).toContain(m.tip)
    }
  })

  // ── Month indices and names are sequential and correct ──
  it('month names and indices are sequential from 寅 to 丑', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    const expectedNames = ['寅月', '卯月', '辰月', '巳月', '午月', '未月', '申月', '酉月', '戌月', '亥月', '子月', '丑月']
    const expectedBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

    for (let i = 0; i < 12; i++) {
      expect(result.months[i].monthIndex).toBe(i + 1)
      expect(result.months[i].monthName).toBe(expectedNames[i])
      expect(result.months[i].monthBranch).toBe(expectedBranches[i])
    }
  })

  // ── Gregorian labels use solar term boundaries ──
  it('gregorian labels span consecutive solar term boundaries', () => {
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')

    for (let i = 0; i < 12; i++) {
      const current = result.months[i]
      const next = result.months[(i + 1) % 12]

      // Current's end should equal next's start
      const [, currentEnd] = current.gregorianLabel.split('—')
      const [nextStart] = next.gregorianLabel.split('—')

      expect(currentEnd).toBe(nextStart)
    }
  })

  // ── Five-element interaction scoring ──
  it('monotonically scores 生 higher than 克 for the same element pairs', () => {
    // We need animals with neutral (无特殊关系) months to isolate element scoring.
    // Snake (巳, 火): 巳特殊关系: 申(合刑破), 寅(刑害破), 亥(冲).
    // Find months where Snake has NO special branch relationship, then check
    // that 生 (month generates user) scores higher than 克 (month restrains user).

    const snake = calculateMonthlyFortune(2001, 2026, '巳', '火')
    const neutralSnake = snake.months.filter(m => m.relationship === '无特殊关系')

    // From the scoring logic:
    //   monthElement generates userElement (+6): 木生火(月令生扶)
    //   monthElement restrains userElement (-6): 水克火(压力较大)
    //   userElement generates monthElement (-3): 火生土(付出较多)
    //   userElement restrains monthElement (+3): 火克金(主导局面)
    //   Same element (+4): 得令当旺

    for (const month of neutralSnake) {
      const monthElement = month.monthBranch === '寅' || month.monthBranch === '卯' ? '木' :
        month.monthBranch === '巳' || month.monthBranch === '午' ? '火' :
        month.monthBranch === '申' || month.monthBranch === '酉' ? '金' :
        month.monthBranch === '亥' || month.monthBranch === '子' ? '水' : '土'

      // 生 (木生火): month generates user → score base +6
      if (monthElement === '木') {
        expect(month.score).toBeGreaterThan(55) // 55 base + 6 → 61
      }
      // 克 (水克火): month restrains user → score base -6
      if (monthElement === '水') {
        expect(month.score).toBeLessThan(55) // 55 base - 6 → 49
      }
    }

    // Verify: 木月 score > 水月 score for snake (火) user
    const woodMonth = neutralSnake.find(m => m.monthBranch === '寅' || m.monthBranch === '卯')
    const waterMonth = neutralSnake.find(m => m.monthBranch === '亥' || m.monthBranch === '子')
    if (woodMonth && waterMonth) {
      expect(woodMonth.score).toBeGreaterThan(waterMonth.score)
    }

    // Also test Horse (午, 火): similar but with different neutral months
    const horse = calculateMonthlyFortune(2002, 2026, '午', '火')
    const neutralHorse = horse.months.filter(m => m.relationship === '无特殊关系')
    const woodHorse = neutralHorse.find(m => m.monthBranch === '寅' || m.monthBranch === '卯')
    const waterHorse = neutralHorse.find(m => m.monthBranch === '亥' || m.monthBranch === '子')
    if (woodHorse && waterHorse) {
      expect(woodHorse.score).toBeGreaterThan(waterHorse.score)
    }
  })

  it('生 scores are consistently higher than 克 across different animal elements', () => {
    // Use Pig (亥, 水) user:
    //   month=金(申酉) → 金生水 → +6 (月令生扶)
    //   month=土(辰戌丑未) → 土克水 → -6 (压力较大)
    const pig = calculateMonthlyFortune(2007, 2026, '亥', '水')
    const neutralPig = pig.months.filter(m => m.relationship === '无特殊关系')
    for (const month of neutralPig) {
      const monthElement = month.monthBranch === '寅' || month.monthBranch === '卯' ? '木' :
        month.monthBranch === '巳' || month.monthBranch === '午' ? '火' :
        month.monthBranch === '申' || month.monthBranch === '酉' ? '金' :
        month.monthBranch === '亥' || month.monthBranch === '子' ? '水' : '土'

      if (monthElement === '金') {
        expect(month.tip).toBe('月令生扶，精力充沛，顺势而为')
        expect(month.score).toBeGreaterThan(55)
      }
      if (monthElement === '土') {
        expect(month.tip).toBe('压力较大，保持耐心，稳扎稳打')
        expect(month.score).toBeLessThan(55)
      }
    }
  })
})
