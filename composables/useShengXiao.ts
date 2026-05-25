// ── Lookup Tables ──────────────────────────────────────────────

const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] as const
const EMOJIS = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'] as const
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

const ANIMAL_WUXING: Record<string, string> = {
  '鼠': '水', '牛': '土', '虎': '木', '兔': '木',
  '龙': '土', '蛇': '火', '马': '火', '羊': '土',
  '猴': '金', '鸡': '金', '狗': '土', '猪': '水',
}

const ANIMAL_DIRECTION: Record<string, string> = {
  '鼠': '北', '牛': '东北', '虎': '东北', '兔': '东',
  '龙': '东南', '蛇': '南', '马': '南', '羊': '西南',
  '猴': '西', '鸡': '西', '狗': '西北', '猪': '北',
}

const NAYIN_TABLE: string[] = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火',
  '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土',
  '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木',
  '壁上土', '金箔金', '佛灯火', '天河水', '大驿土', '钗钏金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]

// ── Compatibility Pair Tables ─────────────────────────────────

/** 三合 groups: each group of 3 animals that harmonize */
const SANHE_GROUPS: number[][] = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]]

/** 六合 pairs: each pair of 2 animals that harmonize */
const LIUHE_PAIRS: number[][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]]

/** 相冲 pairs: clashing animals */
const CHONG_PAIRS: number[][] = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]]

/** 相害 pairs: harming animals */
const HAI_PAIRS: number[][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]]

// ── Fortune multipliers ───────────────────────────────────────

// ── Personality Data ──────────────────────────────────────────

const PERSONALITY_PRO: Record<string, string[]> = {
  '鼠': ['聪明机智', '适应力强', '社交活跃', '观察敏锐'],
  '牛': ['勤劳踏实', '意志坚定', '忠诚可靠', '耐心细致'],
  '虎': ['勇敢自信', '领导力强', '热情慷慨', '正义感强'],
  '兔': ['温柔善良', '心思细腻', '品味优雅', '谨慎稳重'],
  '龙': ['自信热情', '富有创意', '气度不凡', '领导才能'],
  '蛇': ['智慧深邃', '神秘优雅', '直觉敏锐', '沉静内敛'],
  '马': ['奔放自由', '热情开朗', '行动力强', '善于交际'],
  '羊': ['温和善良', '艺术天赋', '体贴温柔', '坚韧耐心'],
  '猴': ['聪明灵活', '幽默风趣', '创新能力强', '社交达人'],
  '鸡': ['勤奋认真', '自信果断', '观察力强', '守时守信'],
  '狗': ['忠诚正直', '责任心强', '善良可靠', '守护意识'],
  '猪': ['诚实宽容', '乐观豁达', '温和敦厚', '知足常乐'],
}

const PERSONALITY_CON: Record<string, string[]> = {
  '鼠': ['多疑谨慎', '目光短浅', '善变不定', '爱占小利'],
  '牛': ['固执刻板', '不善变通', '缺乏浪漫', '严肃寡言'],
  '虎': ['冲动急躁', '好胜心强', '容易冒险', '霸道专断'],
  '兔': ['优柔寡断', '保守怯懦', '逃避现实', '敏感多虑'],
  '龙': ['傲慢自负', '急躁冲动', '好高骛远', '不够务实'],
  '蛇': ['多疑猜忌', '冷漠孤僻', '占有欲强', '过于谨慎'],
  '马': ['急躁冲动', '缺乏耐心', '半途而废', '情绪起伏'],
  '羊': ['优柔寡断', '依赖性强', '悲观消极', '缺乏主见'],
  '猴': ['浮躁善变', '好胜心强', '缺乏恒心', '爱耍小聪明'],
  '鸡': ['挑剔苛刻', '爱炫耀', '固执己见', '过于现实'],
  '狗': ['固执保守', '多虑焦虑', '批评性强', '过于忠诚'],
  '猪': ['懒惰贪图', '容易轻信', '固执己见', '缺乏紧迫感'],
}

// ── Lucky Data ────────────────────────────────────────────────

const LUCKY_DATA: Record<string, { numbers: number[], colors: string[], direction: string }> = {
  '鼠': { numbers: [2, 3], colors: ['蓝色', '金色'], direction: '东南' },
  '牛': { numbers: [1, 9], colors: ['绿色', '金色'], direction: '西南' },
  '虎': { numbers: [1, 3, 5], colors: ['绿色', '蓝色'], direction: '东北' },
  '兔': { numbers: [3, 6, 9], colors: ['绿色', '蓝色'], direction: '东' },
  '龙': { numbers: [1, 6, 7], colors: ['金色', '银色'], direction: '东南' },
  '蛇': { numbers: [2, 8, 9], colors: ['红色', '黄色'], direction: '南' },
  '马': { numbers: [2, 3, 7], colors: ['红色', '绿色'], direction: '南' },
  '羊': { numbers: [2, 7], colors: ['绿色', '红色'], direction: '西南' },
  '猴': { numbers: [1, 4, 7], colors: ['金色', '蓝色'], direction: '西' },
  '鸡': { numbers: [5, 7, 8], colors: ['金色', '黄色'], direction: '西' },
  '狗': { numbers: [3, 4, 9], colors: ['绿色', '红色'], direction: '西北' },
  '猪': { numbers: [1, 2, 9], colors: ['金色', '蓝色'], direction: '北' },
}

// ── Types ─────────────────────────────────────────────────────

export interface FortuneDimension {
  level: string
  score: number
}

export interface Fortune {
  career: FortuneDimension
  wealth: FortuneDimension
  love: FortuneDimension
  health: FortuneDimension
}

export interface Compatibility {
  animal: string
  emoji: string
  relation: '三合' | '六合' | '中吉' | '相冲' | '相害' | '相刑' | '相克'
  level: 'great' | 'good' | 'bad'
}

export interface Lucky {
  numbers: number[]
  colors: string[]
  direction: string
}

export interface ShengXiaoResult {
  year: number
  animal: string
  animalEmoji: string
  heavenlyStem: string
  earthlyBranch: string
  stemBranch: string
  wuXing: string
  naYin: string
  direction: string
  yangOrYin: string
  fortune: Fortune
  compatibility: Compatibility[]
  personalityPro: string[]
  personalityCon: string[]
  lucky: Lucky
}

// ── Helper Functions ──────────────────────────────────────────

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function getAnimalIndex(year: number): number {
  return mod(year - 4, 12)
}

function getStemIndex(year: number): number {
  return mod(year - 4, 10)
}

/**
 * Determine the effective zodiac year based on a current date.
 * Uses a simplified rule: the lunar (zodiac) new year starts on Feb 4.
 * Dates before Feb 4 are still in the previous year's zodiac.
 */
function getCurrentZodiacYear(currentDate: Date): number {
  const year = currentDate.getFullYear()
  const feb4 = new Date(year, 1, 4) // month is 0-indexed, so 1 = February
  return currentDate < feb4 ? year - 1 : year
}

/**
 * Calculate the sexagenary cycle position (0-59) from stem and branch indices.
 * Solves P % 10 = stemIndex, P % 12 = branchIndex using CRT.
 */
function getSexagenaryPosition(stemIndex: number, branchIndex: number): number {
  // P ≡ stemIndex (mod 10), P ≡ branchIndex (mod 12)
  // Since gcd(10, 12) = 2, a solution exists when (stemIndex - branchIndex) % 2 === 0
  const diff = stemIndex - branchIndex
  const k = mod(diff / 2, 6)
  return mod(stemIndex + 10 * k, 60)
}

function getFortuneLevel(score: number): string {
  if (score >= 75) return '大吉'
  if (score >= 60) return '中吉'
  if (score >= 45) return '小吉'
  return '平'
}

function getCompatibility(animalIndex: number): Compatibility[] {
  const result: Compatibility[] = []
  const addedIndices = new Set<number>()

  // 1. 三合 (great harmony) — add the other two in the group
  for (const group of SANHE_GROUPS) {
    if (group.includes(animalIndex)) {
      for (const idx of group) {
        if (idx !== animalIndex && !addedIndices.has(idx)) {
          addedIndices.add(idx)
          result.push({
            animal: ANIMALS[idx],
            emoji: EMOJIS[idx],
            relation: '三合',
            level: 'great',
          })
        }
      }
      break
    }
  }

  // 2. 六合 (personal harmony) — add the paired animal
  for (const pair of LIUHE_PAIRS) {
    if (pair.includes(animalIndex)) {
      const partner = pair[0] === animalIndex ? pair[1] : pair[0]
      if (!addedIndices.has(partner)) {
        addedIndices.add(partner)
        result.push({
          animal: ANIMALS[partner],
          emoji: EMOJIS[partner],
          relation: '六合',
          level: 'great',
        })
      }
      break
    }
  }

  // 3. 相冲 (clash) — bad relation
  for (const pair of CHONG_PAIRS) {
    if (pair.includes(animalIndex)) {
      const partner = pair[0] === animalIndex ? pair[1] : pair[0]
      if (!addedIndices.has(partner)) {
        addedIndices.add(partner)
        result.push({
          animal: ANIMALS[partner],
          emoji: EMOJIS[partner],
          relation: '相冲',
          level: 'bad',
        })
      }
      break
    }
  }

  // 4. 相害 (harm) — bad relation
  for (const pair of HAI_PAIRS) {
    if (pair.includes(animalIndex)) {
      const partner = pair[0] === animalIndex ? pair[1] : pair[0]
      if (!addedIndices.has(partner)) {
        addedIndices.add(partner)
        result.push({
          animal: ANIMALS[partner],
          emoji: EMOJIS[partner],
          relation: '相害',
          level: 'bad',
        })
      }
      break
    }
  }

  // 5. Fill remaining slots with 中吉 (good) using remaining animals
  if (result.length < 6) {
    for (let i = 0; i < 12; i++) {
      if (i !== animalIndex && !addedIndices.has(i)) {
        addedIndices.add(i)
        result.push({
          animal: ANIMALS[i],
          emoji: EMOJIS[i],
          relation: '中吉',
          level: 'good',
        })
        if (result.length >= 6) break
      }
    }
  }

  return result
}

// ── Main Function ─────────────────────────────────────────────

export function calculateShengXiao(
  birthYear: number,
  calendar: 'solar' | 'lunar',
  currentDate?: Date,
): ShengXiaoResult {
  // ── Determine animal index ──
  let animalIndex: number

  if (calendar === 'solar' && currentDate) {
    const currentZodiacYear = getCurrentZodiacYear(currentDate)
    // When the birth year is the same as or the immediate previous year
    // of the current zodiac year, use the current zodiac year's animal
    // to handle lunar new year boundary transitions.
    if (birthYear === currentZodiacYear || birthYear === currentZodiacYear - 1) {
      animalIndex = getAnimalIndex(currentZodiacYear)
    } else {
      animalIndex = getAnimalIndex(birthYear)
    }
  } else {
    animalIndex = getAnimalIndex(birthYear)
  }

  // ── Basic fields ──
  const animal = ANIMALS[animalIndex]
  const animalEmoji = EMOJIS[animalIndex]
  const earthlyBranch = BRANCHES[animalIndex]

  // ── Heavenly stem from birth year ──
  const stemIndex = getStemIndex(birthYear)
  const heavenlyStem = STEMS[stemIndex]
  const stemBranch = heavenlyStem + earthlyBranch

  // ── Sexagenary cycle & NaYin ──
  const sexagenaryPosition = getSexagenaryPosition(stemIndex, animalIndex)
  const nayinIndex = Math.floor(sexagenaryPosition / 2)
  const naYin = NAYIN_TABLE[nayinIndex]

  // ── WuXing & Direction ──
  const wuXing = ANIMAL_WUXING[animal]
  const direction = ANIMAL_DIRECTION[animal]

  // ── Yin/Yang ──
  const yangOrYin = stemIndex % 2 === 0 ? '阳' : '阴'

  // ── Fortune ──
  const fortuneYear = currentDate ? currentDate.getFullYear() : birthYear
  const fortuneSeed = fortuneYear * 7 + animalIndex * 13 + stemIndex * 17

  const careerScore = ((fortuneSeed * 19 + 11) % 61) + 30
  const wealthScore = ((fortuneSeed * 23 + 17) % 61) + 30
  const loveScore = ((fortuneSeed * 29 + 5) % 61) + 30
  const healthScore = ((fortuneSeed * 31 + 13) % 61) + 30

  // ── Compatibility ──
  const compatibility = getCompatibility(animalIndex)

  // ── Personality ──
  const personalityPro = PERSONALITY_PRO[animal]
  const personalityCon = PERSONALITY_CON[animal]

  // ── Lucky ──
  const lucky = { ...LUCKY_DATA[animal] }

  return {
    year: birthYear,
    animal,
    animalEmoji,
    heavenlyStem,
    earthlyBranch,
    stemBranch,
    wuXing,
    naYin,
    direction,
    yangOrYin,
    fortune: {
      career: { score: careerScore, level: getFortuneLevel(careerScore) },
      wealth: { score: wealthScore, level: getFortuneLevel(wealthScore) },
      love: { score: loveScore, level: getFortuneLevel(loveScore) },
      health: { score: healthScore, level: getFortuneLevel(healthScore) },
    },
    compatibility,
    personalityPro,
    personalityCon,
    lucky,
  }
}
