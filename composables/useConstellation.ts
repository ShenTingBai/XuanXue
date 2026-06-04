import { CONSTELLATION_PAIRING_EXPLANATIONS } from '~/constants/constellation'

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
    explanation?: string
  }>
  /** 月亮星座（出生时月亮所在星座），仅在提供出生年份时计算 */
  moonSign?: {
    name: string
    symbol: string
    /** 月亮星座的解读文本——描述内在情感特质 */
    interpretation: string
  }
  /** 上升星座（出生时东方地平线升起的星座），仅在提供出生时辰时计算 */
  risingSign?: {
    name: string
    symbol: string
    /** 上升星座的解读文本——描述外在社交形象 */
    interpretation: string
  }
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
    rulingPlanet: '冥王星', // 传统守护星：火星
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
    rulingPlanet: '天王星', // 传统守护星：土星
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
    rulingPlanet: '海王星', // 传统守护星：木星
    luckyColor: '海蓝色',
    luckyNumber: 7,
    personality: '浪漫梦幻，富有想象力和艺术天赋，温柔善良，具有强烈的共情能力。',
  },
]

// ── Moon Sign Interpretations ──────────────────────────────

const MOON_INTERPRETATIONS: Record<string, string> = {
  '白羊座': '月亮在白羊座时，情绪如烈火般炽烈直接。喜怒形于色，不耐等待，内心住着一个永远长不大的孩子——想要就要立刻得到，生气就当场爆发。这种赤子之心让你格外真实，但也容易因冲动而后悔。',
  '金牛座': '月亮在金牛座，内心渴望稳定与安全感。情绪需要缓慢释放，突如其来的变化让你不安。感官享受——美食、音乐、触感——是你最好的情绪充电方式。一旦被触怒，你会展现出令人惊讶的固执。',
  '双子座': '月亮在双子座，情绪如风般多变。内心充满好奇，无聊是最大的情绪杀手。不开心的事聊一聊就过去了，总是在不同想法之间跳跃。你需要精神上的新鲜感来维持情绪平衡。',
  '巨蟹座': '月亮在巨蟹座，这是月亮入庙之位。情绪如潮汐般深邃敏感，共情力极强，家庭观念深重。家是你的安全港湾，回忆是你情绪的锚点。易被他人情绪感染，需学会在情感上设立边界。',
  '狮子座': '月亮在狮子座，内心骄傲而热烈。你需要被关注、被赞美、被看见。情绪表达如同舞台剧——高兴时光芒万丈，受伤时也带着戏剧性的优雅。自尊心是你最敏感的情绪开关。',
  '处女座': '月亮在处女座，情绪被理性层层过滤。你习惯在内心默默分析一切，连情绪都要归类整理。通过做具体的事情来消化情绪，对自己和他人皆有要求。这份挑剔背后是深深的责任感。',
  '天秤座': '月亮在天秤座，内心追求和谐与美感。厌恶冲突与粗鲁，情绪表达优雅而克制。做决定是你最煎熬的事——因为你在意每个人的感受。需要学会接受不完美但足够好的选择。',
  '天蝎座': '月亮在天蝎座，这是月亮落陷之位。情感如深海般浓烈复杂，爱憎分明，绝不肤浅。直觉惊人，能敏锐察觉他人隐藏的动机。情绪记忆极为深刻，最惧被信任之人背叛。',
  '射手座': '月亮在射手座，内心向往辽阔的自由。乐观是你的防御机制——用对未来的期待化解当下的不愉快。你讨厌被情绪束缚，不开心了就想出去走走。需要空间来维持情绪健康。',
  '摩羯座': '月亮在摩羯座，这是月亮失势之位。情绪表达对你来说是件困难的事，习惯将情感深埋心底，用理性与成就武装自己。真正的坚韧不是永不倒下，而是懂得在脆弱时求助。',
  '水瓶座': '月亮在水瓶座，情绪以疏离和理性著称。内心有种超然的冷静，即使在情绪波动中也能抽身观察自己。需要精神共鸣远胜情感依赖，自由对你来说比什么都重要。',
  '双鱼座': '月亮在双鱼座，情绪的海洋没有边界。共情能力惊人，内心世界浪漫而梦幻，艺术与想象是你最好的情绪出口。需学会保护自身能量场——不是每个人的痛苦你都需要去承担。',
}

// ── Rising Sign Interpretations ────────────────────────────

const RISING_INTERPRETATIONS: Record<string, string> = {
  '白羊座': '你给人的第一印象是积极直接、充满活力。行事风风火火，带着一种天真无畏的气场，让人觉得你很有冲劲和行动力。',
  '金牛座': '你给人的第一印象是稳重可靠、踏实从容。气质沉稳温和，让人感到安心和信赖，有时也显得固执己见、不轻易改变。',
  '双子座': '你给人的第一印象是机智健谈、反应灵敏。善于交际，话题丰富多变，让人觉得你聪明有趣，偶尔显得不够深入。',
  '巨蟹座': '你给人的第一印象是温和友善、容易亲近。气质柔和有礼，让人不自觉地想向你倾诉，有着天然的亲和力与包容感。',
  '狮子座': '你给人的第一印象是自信大方、气场强大。举止间带着几分王者风范，让人不自觉地被你的存在吸引和感染。',
  '处女座': '你给人的第一印象是严谨得体、细致周到。做事有条不紊，谈吐逻辑清晰，让人觉得你可靠专业，也带着一丝距离感。',
  '天秤座': '你给人的第一印象是优雅迷人、彬彬有礼。言谈举止得体大方，审美品味出众，和你相处让人感到舒适愉悦。',
  '天蝎座': '你给人的第一印象是深沉神秘、难以捉摸。眼神和气质中透着一种内敛的力量，让人对你既好奇又不敢轻易靠近。',
  '射手座': '你给人的第一印象是开朗乐观、热情直率。笑容和言谈充满感染力，让人觉得你是一个有趣又真诚的伙伴。',
  '摩羯座': '你给人的第一印象是沉稳干练、成熟可靠。气质端正，行事稳重，举手投足间透着一种值得信赖的分量感。',
  '水瓶座': '你给人的第一印象是独特前卫、不拘一格。言谈举止透着与众不同的气质，让人觉得你是个有想法、有意思的人。',
  '双鱼座': '你给人的第一印象是温柔浪漫、富有艺术气质。眼神中带着梦幻的色彩，让人觉得你善良敏感，容易激起保护欲。',
}

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

// ── Astronomical Helpers ────────────────────────────────────

/**
 * Calculate days since J2000.0 epoch (2000-01-01 12:00 UTC).
 * Used for simplified solar/lunar position calculations.
 */
function daysSinceJ2000(date: Date): number {
  const epoch = Date.UTC(2000, 0, 1, 12, 0, 0)
  const ms = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  return (ms - epoch) / 86400000
}

/**
 * Calculate the Sun's approximate ecliptic longitude (0-360 degrees).
 * Simplified formula accurate to ~1 degree for years 1900-2100.
 */
function solarLongitude(days: number): number {
  const M = (357.5291 + 0.98560028 * days) % 360
  const mRad = M * Math.PI / 180
  const C = 1.9148 * Math.sin(mRad) + 0.02 * Math.sin(2 * mRad) + 0.0003 * Math.sin(3 * mRad)
  const lambda = (M + C + 180 + 102.9372) % 360
  return (lambda + 360) % 360
}

/**
 * Calculate the Moon's approximate ecliptic longitude (0-360 degrees).
 * Mean lunar longitude — simplified, accurate to ~5 degrees.
 */
function lunarLongitude(days: number): number {
  return ((218.3165 + 13.176396 * days) % 360 + 360) % 360
}

/**
 * Get the zodiac sign index (0=Aries, 11=Pisces) from ecliptic longitude.
 */
function getSignFromLongitude(lon: number): number {
  return Math.floor(lon / 30)
}

/**
 * Compute angular distance between two ecliptic longitudes (0-180 degrees).
 */
function angularDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % 360
  if (d > 180) d = 360 - d
  return d
}

/**
 * Compute an astrological aspect score based on angular distance.
 * Returns positive for harmonious aspects, negative for challenging ones.
 */
function aspectScore(angle: number): number {
  const ORB = 8
  if (angle <= 8) return 8     // conjunction — intense focus
  if (Math.abs(angle - 60) <= ORB) return 5   // sextile — opportunity
  if (Math.abs(angle - 90) <= ORB) return -6  // square — challenge
  if (Math.abs(angle - 120) <= ORB) return 10 // trine — harmony
  if (Math.abs(angle - 180) <= ORB) return -8 // opposition — tension
  return 0
}

/**
 * Get the element of a zodiac sign from its index.
 */
function elementForSign(signIndex: number): ConstellationResult['element'] {
  return ZODIACS[signIndex].element
}

/**
 * Element compatibility boost.
 * 火 compatible with 土, 风 compatible with 水 (opposites in the 4-element cycle match).
 * Same element: strong boost. Compatible: moderate boost. Incompatible: penalty.
 */
function elementBoost(myElement: ConstellationResult['element'], otherElement: ConstellationResult['element']): number {
  if (myElement === otherElement) return 5
  // Element compatibility based on zodiac element ordering:
  // 火 compatible with 土, 风 compatible with 水
  const compatible: Record<string, string[]> = {
    '火': ['土'], '土': ['火'],
    '风': ['水'], '水': ['风'],
  }
  if (compatible[myElement]?.includes(otherElement)) return 3
  return -3
}

// ── Zodiac Index Helpers ────────────────────────────────────

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
    return (m > sm || m < em) || (m === sm && d >= sd) || (m === em && d <= ed)
  }
  return (m > sm && m < em) || (m === sm && d >= sd) || (m === em && d <= ed)
}

/**
 * Compute deterministic horoscope scores based on simplified solar/lunar positions
 * and astrological aspects. This replaces the previous pure pseudo-random algorithm.
 *
 * Algorithm:
 * 1. Compute Sun's ecliptic longitude for the current date
 * 2. Compute Moon's ecliptic longitude for the current date
 * 3. Calculate aspects between user's sun sign center (15 degrees into the sign)
 *    and the current moon position — this is the primary daily variation driver
 * 4. Sun sign transit influence provides seasonal modulation
 * 5. Derive dimension-specific scores (love/career/wealth/health) from
 *    planetary archetypes: Moon→emotions, Sun→vitality, element→themes
 */
function computeHoroscope(zodiacIndex: number, currentDate: Date): ConstellationResult['todayHoroscope'] {
  const days = daysSinceJ2000(currentDate)
  const sunLon = solarLongitude(days)
  const moonLon = lunarLongitude(days)

  // Current sun sign and element (what sign is the sun transiting through)
  const currentSunSign = getSignFromLongitude(sunLon)
  const currentMoonSign = getSignFromLongitude(moonLon)

  // User's sun sign center (15 degrees into the sign)
  const userCenter = zodiacIndex * 30 + 15

  // User's element
  const userElement = elementForSign(zodiacIndex)

  // -- Core aspects --
  // Moon-to-user aspect: primary daily variation driver (~13.2 deg/day)
  const moonAngle = angularDistance(userCenter, moonLon)
  const moonAspectBonus = aspectScore(moonAngle)

  // Sun-to-user aspect: seasonal/transit influence
  const sunAngle = angularDistance(userCenter, sunLon)
  const sunAspectBonus = aspectScore(sunAngle)

  // -- Element resonance --
  // Current sun's element vs user's element (seasonal influence)
  const sunElement = elementForSign(currentSunSign)
  const sunElementBonus = elementBoost(userElement, sunElement)

  // Current moon's element vs user's element (emotional tone)
  const moonElement = elementForSign(currentMoonSign)
  const moonElementBonus = elementBoost(userElement, moonElement)

  // -- Base overall score (50 = neutral) --
  // Moon aspect is the strongest daily driver
  const overallRaw = 50 + moonAspectBonus * 2.0 + sunAspectBonus * 0.8 + sunElementBonus * 1.2 + moonElementBonus * 0.6

  // -- Dimension-specific adjustments --
  // Love: Moon-heavy (emotions) + Venus-ruled sign affinity
  const loveRaw = overallRaw + moonAspectBonus * 0.8 + moonElementBonus * 0.5
  // Career: Sun-heavy (vitality/action) + Mars-ruled sign affinity
  const careerRaw = overallRaw + sunAspectBonus * 0.6 + sunElementBonus * 0.8
  // Wealth: Jupiter influence via element harmony
  const wealthRaw = overallRaw + sunElementBonus * 1.0 + moonElementBonus * 0.3
  // Health: Moon (daily rhythm) + overall balance
  const healthRaw = overallRaw + moonElementBonus * 0.4

  // Clamp to 0-100
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)))

  return {
    overall: clamp(overallRaw),
    love: clamp(loveRaw),
    career: clamp(careerRaw),
    wealth: clamp(wealthRaw),
    health: clamp(healthRaw),
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
  const elementOrder: Array<ConstellationResult['element']> = ['火', '风', '水', '土']
  const myElementIndex = elementOrder.indexOf(ZODIACS[zodiacIndex].element)

  const candidates: Array<{
    name: string
    symbol: string
    level: 'great' | 'good' | 'bad'
    label: string
    explanation?: string
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
      explanation: CONSTELLATION_PAIRING_EXPLANATIONS[level],
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

/**
 * Calculate the natal moon sign — the zodiac constellation the Moon was in
 * at the moment of birth. Uses simplified mean lunar longitude.
 *
 * @param year - Birth year
 * @param month - Birth month (1-12)
 * @param day - Birth day (1-31)
 * @returns The moon's zodiac sign name and symbol, or undefined if year is missing
 */
export function getMoonSign(year: number | undefined, month: number, day: number): { name: string; symbol: string } | undefined {
  if (year === undefined || year === null) return undefined
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  const birthDate = new Date(year, month - 1, day, 12, 0, 0)
  const days = daysSinceJ2000(birthDate)
  const moonLon = lunarLongitude(days)
  const signIndex = getSignFromLongitude(moonLon)
  return {
    name: ZODIACS[signIndex].name,
    symbol: ZODIACS[signIndex].symbol,
  }
}

/**
 * Calculate the rising sign (ascendant) — the zodiac sign rising on the eastern
 * horizon at the moment of birth. Uses a simplified astronomical formula.
 *
 * Without birth location, assumes UTC+8 (longitude 120°E) and latitude 35°N
 * (roughly central China). Results are approximate and may shift by one sign
 * near sign boundaries or for extreme latitudes.
 *
 * @param birthYear - Birth year
 * @param birthMonth - Birth month (1-12)
 * @param birthDay - Birth day (1-31)
 * @param birthHour - Birth hour (时辰 starting hour, or null if unknown)
 * @param birthMinute - Birth minute (optional, defaults to midpoint of 时辰)
 * @returns Rising sign with name, symbol, and interpretation, or null if no birth hour
 */
export function getRisingSign(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthHour: number | null | undefined,
  birthMinute: number | null | undefined,
): { name: string; symbol: string; interpretation: string } | null {
  if (birthHour === null || birthHour === undefined) return null
  if (birthYear < 1900 || birthYear > 2100) return null
  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) return null

  // Use the midpoint of the 时辰 (2-hour period) if minute is not provided
  const hour = birthHour
  const minute = birthMinute ?? 30

  // Convert local time (assumed UTC+8) to UTC for sidereal time calculation
  const utcDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay, hour - 8, minute, 0))

  // Days since J2000.0 epoch (2000-01-01 12:00 UTC)
  const epoch = Date.UTC(2000, 0, 1, 12, 0, 0)
  const d = (utcDate.getTime() - epoch) / 86400000

  // Greenwich Mean Sidereal Time (degrees)
  const gmst = ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360

  // Local Sidereal Time for assumed longitude (UTC+8 central meridian = 120°E)
  const LST = ((gmst + 120) % 360 + 360) % 360

  // Obliquity of the ecliptic (approx)
  const eps = 23.4393 * Math.PI / 180

  // Assumed latitude (~35°N, roughly central China)
  const lat = 35 * Math.PI / 180

  // Ascendant formula (Meeus, Astronomical Algorithms):
  // tan(ASC) = -cos(LST) / (sin(LST) · cos(ε) + tan(φ) · sin(ε))
  // Implemented as atan2(+cos, -denom) per standard quadrant convention
  // to derive the eastern horizon point (ascendant), not the descendant.
  const lstRad = LST * Math.PI / 180
  const ascRad = Math.atan2(
    Math.cos(lstRad),
    -(Math.sin(lstRad) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps)),
  )
  const ascDeg = ((ascRad * 180 / Math.PI) + 360) % 360

  const signIndex = Math.floor(ascDeg / 30) % 12
  const sign = ZODIACS[signIndex]

  return {
    name: sign.name,
    symbol: sign.symbol,
    interpretation: RISING_INTERPRETATIONS[sign.name] || '',
  }
}

// ── Main Function ────────────────────────────────────────────

/**
 * Calculate constellation information for a given birth month/day.
 *
 * @param month - Birth month (1-12) for sun sign display
 * @param day - Birth day (1-31) for sun sign display
 * @param currentDate - Optional date for horoscope calculation. Defaults to today.
 * @param birthYear - Optional birth year for natal moon/rising sign calculation.
 * @param birthMonth - Optional actual birth month for natal calculations (defaults to `month`)
 * @param birthDay - Optional actual birth day for natal calculations (defaults to `day`)
 * @param birthHour - Optional birth hour (时辰 starting hour) for rising sign.
 * @param birthMinute - Optional birth minute for rising sign precision.
 * @returns Complete constellation result with horoscope, compatibility, Yi/Ji, etc.
 */
export function calculateConstellation(
  month: number,
  day: number,
  currentDate?: Date,
  birthYear?: number,
  birthMonth?: number,
  birthDay?: number,
  birthHour?: number | null,
  birthMinute?: number | null,
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

  // ── 月亮星座（始终用真实出生日期计算） ──
  const natalMonth = birthMonth ?? month
  const natalDay = birthDay ?? day
  const moonSign = getMoonSign(birthYear, natalMonth, natalDay)

  // ── 上升星座 ──
  const risingSign = birthYear !== undefined
    ? getRisingSign(birthYear, natalMonth, natalDay, birthHour ?? null, birthMinute ?? null)
    : null

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
    moonSign: moonSign
      ? { ...moonSign, interpretation: MOON_INTERPRETATIONS[moonSign.name] || '' }
      : undefined,
    risingSign: risingSign ?? undefined,
  }
}
