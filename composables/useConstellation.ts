// ── Types ─────────────────────────────────────────────────────

export interface ConstellationResult {
  name: string
  symbol: string
  dateRange: string
  element: '火' | '土' | '风' | '水'
  rulingPlanet: string
  luckyColor: string
  luckyNumber: number
  personality: string
  todayHoroscope: {
    overall: number
    love: number
    career: number
    wealth: number
    health: number
  }
  todayYi: string[]
  todayJi: string[]
  compatibility: Array<{
    name: string
    symbol: string
    level: 'great' | 'good' | 'bad'
    label: string
  }>
}

// ── Zodiac Data ──────────────────────────────────────────────

interface ZodiacEntry {
  name: string
  symbol: string
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  element: '火' | '土' | '风' | '水'
  rulingPlanet: string
  luckyColor: string
  luckyNumber: number
  personality: string
}

export const ZODIACS: ZodiacEntry[] = [
  {
    name: '白羊座',
    symbol: '♈',
    startMonth: 3, startDay: 21,
    endMonth: 4, endDay: 19,
    element: '火',
    rulingPlanet: '火星',
    luckyColor: '红色',
    luckyNumber: 9,
    personality: '热情勇敢，充满活力与冒险精神，自信直率，是天生的领导者。',
  },
  {
    name: '金牛座',
    symbol: '♉',
    startMonth: 4, startDay: 20,
    endMonth: 5, endDay: 20,
    element: '土',
    rulingPlanet: '金星',
    luckyColor: '绿色',
    luckyNumber: 6,
    personality: '稳重踏实，追求物质与感官享受，耐心坚韧，一旦决定便不易动摇。',
  },
  {
    name: '双子座',
    symbol: '♊',
    startMonth: 5, startDay: 21,
    endMonth: 6, endDay: 21,
    element: '风',
    rulingPlanet: '水星',
    luckyColor: '黄色',
    luckyNumber: 5,
    personality: '机智聪慧，好奇心旺盛，善于沟通交际，适应力极强，思维敏捷多变。',
  },
  {
    name: '巨蟹座',
    symbol: '♋',
    startMonth: 6, startDay: 22,
    endMonth: 7, endDay: 22,
    element: '水',
    rulingPlanet: '月亮',
    luckyColor: '白色',
    luckyNumber: 2,
    personality: '温柔体贴，情感丰富细腻，家庭观念强烈，具有极强的保护欲和同理心。',
  },
  {
    name: '狮子座',
    symbol: '♌',
    startMonth: 7, startDay: 23,
    endMonth: 8, endDay: 22,
    element: '火',
    rulingPlanet: '太阳',
    luckyColor: '金色',
    luckyNumber: 1,
    personality: '自信慷慨，热情洋溢，天生具有领导风范和王者气质，喜欢成为焦点。',
  },
  {
    name: '处女座',
    symbol: '♍',
    startMonth: 8, startDay: 23,
    endMonth: 9, endDay: 22,
    element: '土',
    rulingPlanet: '水星',
    luckyColor: '灰色',
    luckyNumber: 5,
    personality: '追求完美，细致严谨，理性务实，善于分析和规划，是出色的执行者。',
  },
  {
    name: '天秤座',
    symbol: '♎',
    startMonth: 9, startDay: 23,
    endMonth: 10, endDay: 23,
    element: '风',
    rulingPlanet: '金星',
    luckyColor: '粉色',
    luckyNumber: 6,
    personality: '优雅公正，追求和谐与平衡，社交能力出众，审美品味高雅。',
  },
  {
    name: '天蝎座',
    symbol: '♏',
    startMonth: 10, startDay: 24,
    endMonth: 11, endDay: 21,
    element: '水',
    rulingPlanet: '冥王星',
    luckyColor: '紫色',
    luckyNumber: 8,
    personality: '深沉神秘，意志力极强，洞察力敏锐，情感炽烈，具有强大的内在力量。',
  },
  {
    name: '射手座',
    symbol: '♐',
    startMonth: 11, startDay: 22,
    endMonth: 12, endDay: 21,
    element: '火',
    rulingPlanet: '木星',
    luckyColor: '蓝色',
    luckyNumber: 3,
    personality: '乐观开朗，热爱自由与冒险，坦率真诚，追求真理与人生的意义。',
  },
  {
    name: '摩羯座',
    symbol: '♑',
    startMonth: 12, startDay: 22,
    endMonth: 1, endDay: 19,
    element: '土',
    rulingPlanet: '土星',
    luckyColor: '棕色',
    luckyNumber: 8,
    personality: '坚韧不拔，目标明确，稳重务实，具有极强的责任感和事业心。',
  },
  {
    name: '水瓶座',
    symbol: '♒',
    startMonth: 1, startDay: 20,
    endMonth: 2, endDay: 18,
    element: '风',
    rulingPlanet: '天王星',
    luckyColor: '青色',
    luckyNumber: 4,
    personality: '独立创新，思想前卫，重视自由与平等，富有人道主义精神和对未来的洞察力。',
  },
  {
    name: '双鱼座',
    symbol: '♓',
    startMonth: 2, startDay: 19,
    endMonth: 3, endDay: 20,
    element: '水',
    rulingPlanet: '海王星',
    luckyColor: '海蓝色',
    luckyNumber: 7,
    personality: '浪漫梦幻，富有想象力和艺术天赋，温柔善良，具有强烈的共情能力。',
  },
]

// ── Yi/Ji Items ──────────────────────────────────────────────

const YI_POOLS: Record<string, string[]> = {
  high: ['洽谈合作', '开拓新项目', '投资理财', '表达心意', '签署合同', '出差远行', '社交活动', '学习进修'],
  mid: ['日常办公', '整理规划', '家人团聚', '阅读思考', '适度运动', '拜访朋友', '处理琐事', '休闲娱乐'],
  low: ['谨慎决策', '休养生息', '反思总结', '与人沟通', '低调行事', '暂缓投资', '注意健康', '避免争执'],
}

const JI_POOLS: Record<string, string[]> = {
  high: ['冲动消费', '与人争执', '过度承诺', '轻信他人'],
  mid: ['拖延犹豫', '过度疲劳', '冒险投资', '草率决定'],
  low: ['重大决策', '长途出行', '签订合同', '借贷担保', '投机取巧', '与人冲突'],
}

// ── Helper Functions ─────────────────────────────────────────

/**
 * Determine which zodiac constellation a given birth month/day falls into.
 * Returns the index into the ZODIACS array.
 */
export function getZodiacIndex(month: number, day: number): number {
  for (let i = 0; i < ZODIACS.length; i++) {
    const z = ZODIACS[i]
    if (isDateInRange(month, day, z.startMonth, z.startDay, z.endMonth, z.endDay)) {
      return i
    }
  }
  // Fallback — should never reach here since all dates are covered
  return 10 // Aquarius
}

/**
 * Check if a given (month, day) falls within the range [startMonth/startDay, endMonth/endDay].
 * Handles the Capricorn wrap-around case where startMonth > endMonth.
 */
function isDateInRange(
  m: number, d: number,
  sm: number, sd: number,
  em: number, ed: number,
): boolean {
  if (sm > em) {
    // Wrap-around case (Capricorn: Dec 22 — Jan 19)
    return (m > sm || m < em) || (m === sm && d >= sd) || (m === em && d <= ed)
  }
  // Normal case
  return (m > sm && m < em) || (m === sm && d >= sd) || (m === em && d <= ed)
}

/**
 * Compute deterministic 5-dimensional horoscope scores based on zodiac index and current date.
 */
function computeHoroscope(zodiacIndex: number, currentDate: Date): ConstellationResult['todayHoroscope'] {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const day = currentDate.getDate()

  const dateNum = year * 10000 + month * 100 + day
  const seed = (dateNum * 7 + zodiacIndex * 97) % 7919
  const overall = Math.round((seed / 7919) * 100)

  return {
    overall,
    love: Math.max(0, overall - 12),
    career: Math.max(0, Math.min(100, overall + 8)),
    wealth: Math.max(0, overall - 20),
    health: Math.max(0, overall - 5),
  }
}

/**
 * Deterministic Fisher-Yates shuffle using a numeric seed.
 */
function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let currentSeed = seed
  for (let i = result.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 16807 + 1) % 2147483647
    const j = currentSeed % (i + 1)
    const tmp = result[i]
    result[i] = result[j]
    result[j] = tmp
  }
  return result
}

/**
 * Pick 3 Yi (宜) and 2 Ji (忌) items based on overall horoscope score.
 */
function pickYiJi(overall: number): { todayYi: string[]; todayJi: string[] } {
  const poolKey: 'high' | 'mid' | 'low' = overall >= 60 ? 'high' : overall >= 40 ? 'mid' : 'low'

  const yiPool = YI_POOLS[poolKey]
  const jiPool = JI_POOLS[poolKey]

  const shuffledYi = deterministicShuffle(yiPool, overall)
  const shuffledJi = deterministicShuffle(jiPool, overall)

  return {
    todayYi: shuffledYi.slice(0, 3),
    todayJi: shuffledJi.slice(0, 2),
  }
}

/**
 * Compute 4 constellation compatibility entries.
 * Same element = 'great' (绝配), opposing element = 'bad' (相克), others = 'good' (中配).
 */
function computeConstellationCompat(zodiacIndex: number): ConstellationResult['compatibility'] {
  const elementOrder: Array<ConstellationResult['element']> = ['火', '土', '风', '水']
  const myElementIndex = elementOrder.indexOf(ZODIACS[zodiacIndex].element)

  const candidates: Array<{
    name: string
    symbol: string
    level: 'great' | 'good' | 'bad'
    label: string
  }> = []

  for (let i = 0; i < ZODIACS.length; i++) {
    if (i === zodiacIndex) continue

    const otherElementIndex = elementOrder.indexOf(ZODIACS[i].element)

    let level: 'great' | 'good' | 'bad'
    let label: string

    if (myElementIndex === otherElementIndex) {
      level = 'great'
      label = '绝配'
    } else if ((myElementIndex + 2) % 4 === otherElementIndex) {
      level = 'bad'
      label = '相克'
    } else {
      level = 'good'
      label = '中配'
    }

    candidates.push({
      name: ZODIACS[i].name,
      symbol: ZODIACS[i].symbol,
      level,
      label,
    })
  }

  // Sort: great first, then good, then bad
  const levelOrder: Record<string, number> = { great: 0, good: 1, bad: 2 }
  candidates.sort((a, b) => levelOrder[a.level] - levelOrder[b.level])

  return candidates.slice(0, 4)
}

/**
 * Format a date range string like "3月21日 — 4月19日".
 */
function formatDateRange(z: ZodiacEntry): string {
  return `${z.startMonth}月${z.startDay}日 — ${z.endMonth}月${z.endDay}日`
}

// ── Main Function ────────────────────────────────────────────

/**
 * Calculate constellation information for a given birth month/day.
 *
 * @param month - Birth month (1-12)
 * @param day - Birth day (1-31)
 * @param currentDate - Optional date for horoscope calculation. Defaults to today.
 * @returns Complete constellation result with horoscope, compatibility, Yi/Ji, etc.
 */
export function calculateConstellation(
  month: number,
  day: number,
  currentDate?: Date,
): ConstellationResult {
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid month: ${month}. Month must be between 1 and 12.`)
  }
  if (day < 1 || day > 31) {
    throw new RangeError(`Invalid day: ${day}. Day must be between 1 and 31.`)
  }
  const date = currentDate ?? new Date()
  const index = getZodiacIndex(month, day)
  const zodiac = ZODIACS[index]

  const horoscope = computeHoroscope(index, date)
  const { todayYi, todayJi } = pickYiJi(horoscope.overall)
  const compatibility = computeConstellationCompat(index)

  return {
    name: zodiac.name,
    symbol: zodiac.symbol,
    dateRange: formatDateRange(zodiac),
    element: zodiac.element,
    rulingPlanet: zodiac.rulingPlanet,
    luckyColor: zodiac.luckyColor,
    luckyNumber: zodiac.luckyNumber,
    personality: zodiac.personality,
    todayHoroscope: horoscope,
    todayYi,
    todayJi,
    compatibility,
  }
}
