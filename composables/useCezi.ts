// ── 测字占卜 · 字形拆解与数理五行分析引擎 ──────────────────

import { getStrokeCount } from '~/constants/stroke-dict'
import {
  STRUCTURE_TYPES,
  RADICAL_ELEMENT,
  CHAR_ELEMENT_MAP,
  CHAR_STRUCTURE_MAP,
  getNumberFortune,
  ELEMENT_INTERPRETATIONS,
  STRUCTURE_FORTUNE,
} from '~/constants/cezi'

// ── Types ─────────────────────────────────────────────

export interface CeziResult {
  character: string
  strokeCount: number
  strokeSource: 'dictionary' | 'estimated'
  numberFortune: { category: string; desc: string }
  primaryElement: string
  radicalElement: string | null
  structure: string
  structureName: string
  structureDesc: string
  interpretation: string
}

// ── CJK Character Detection ───────────────────────────

/** Check if a character is in any CJK ideographs range (unified + all extensions). */
function isCJKChar(char: string): boolean {
  if (char.length !== 1) return false
  const cp = char.codePointAt(0)
  if (cp == null) return false
  // CJK Unified Ideographs: U+4E00 – U+9FFF
  // CJK Extension A: U+3400 – U+4DBF
  // CJK Compatibility Ideographs: U+F900 – U+FAFF
  // CJK Extension B: U+20000 – U+2A6DF
  // CJK Extension C: U+2A700 – U+2B73F
  // CJK Extension D: U+2B740 – U+2B81F
  // CJK Extension E: U+2B820 – U+2CEAF
  // CJK Extension F: U+2CEB0 – U+2EBEF
  // CJK Extension G: U+30000 – U+3134F
  // CJK Extension H: U+31350 – U+323AF
  // CJK Compatibility Supplement: U+2F800 – U+2FA1F
  return (cp >= 0x4E00 && cp <= 0x9FFF)
    || (cp >= 0x3400 && cp <= 0x4DBF)
    || (cp >= 0xF900 && cp <= 0xFAFF)
    || (cp >= 0x20000 && cp <= 0x2A6DF)
    || (cp >= 0x2A700 && cp <= 0x2B73F)
    || (cp >= 0x2B740 && cp <= 0x2B81F)
    || (cp >= 0x2B820 && cp <= 0x2CEAF)
    || (cp >= 0x2CEB0 && cp <= 0x2EBEF)
    || (cp >= 0x30000 && cp <= 0x3134F)
    || (cp >= 0x31350 && cp <= 0x323AF)
    || (cp >= 0x2F800 && cp <= 0x2FA1F)
}

// ── Stroke Number → Wuxing ────────────────────────────

function getWuxingFromNumber(num: number): string {
  const n = num % 10 === 0 ? 10 : num % 10
  const map: Record<number, string> = {
    1: '木', 2: '木',
    3: '火', 4: '火',
    5: '土', 6: '土',
    7: '金', 8: '金',
    9: '水', 10: '水',
  }
  return map[n] || '土'
}

// ── Radical Detection ─────────────────────────────────

/**
 * Detect the radical element of a character.
 * Strategy: first check the full character against CHAR_ELEMENT_MAP,
 * then check if any known radical character is present in the char.
 */
function detectRadicalElement(char: string): string | null {
  // 1. Full character lookup
  if (CHAR_ELEMENT_MAP[char]) {
    return CHAR_ELEMENT_MAP[char]
  }

  // 2. Substring check: if the character contains a known radical prefix/suffix
  // Check single-char radicals like 氵, 钅, etc.
  for (const [radical, element] of Object.entries(RADICAL_ELEMENT)) {
    if (radical.length === 1 && char.includes(radical)) {
      return element
    }
  }

  // 3. The character itself might BE a radical
  if (RADICAL_ELEMENT[char]) {
    return RADICAL_ELEMENT[char]
  }

  return null
}

// ── Structure Detection ───────────────────────────────

/**
 * Determine the structure type of a CJK character.
 * Uses predefined mapping first, then heuristic checks.
 */
function detectStructure(char: string): string {
  // 1. Predefined mapping
  const known = CHAR_STRUCTURE_MAP.get(char)
  if (known) return known

  // 2. Heuristic: check for enclosure patterns
  // Characters that commonly form enclosures
  const enclosureFrames = ['口', '囗', '门', '門', '鬥']

  for (const frame of enclosureFrames) {
    if (char.includes(frame)) return 'enclosure'
  }

  // 3. Default to 'single' for unknown characters
  return 'single'
}

// ── Interpretation Generation ─────────────────────────

function generateInterpretation(result: Omit<CeziResult, 'interpretation'>): string {
  const { character, strokeCount, strokeSource, numberFortune, primaryElement, radicalElement, structure, structureName, structureDesc } = result

  const lines: string[] = []

  // Opening
  const estimateNote = strokeSource === 'estimated' ? '（估算）' : ''
  lines.push(`「${character}」字，笔画${strokeCount}${estimateNote}，属${primaryElement}性。`)

  // Number fortune
  lines.push(`数理${strokeCount}，${numberFortune.category}。${numberFortune.desc}`)

  // Element traits
  const elemInterp = ELEMENT_INTERPRETATIONS[primaryElement]
  if (elemInterp) {
    lines.push(`五行属${primaryElement}。${elemInterp.traits}事业方面，${elemInterp.career}感情方面，${elemInterp.love}`)
  }

  // Radical element interaction
  if (radicalElement && radicalElement !== primaryElement) {
    lines.push(`此字偏旁属${radicalElement}，与数理${primaryElement}性相异。`)
    // Generate interaction note
    const interactionNote = getElementInteractionNote(primaryElement, radicalElement)
    if (interactionNote) {
      lines.push(interactionNote)
    }
  }

  // Structure meaning
  const structInfo = STRUCTURE_TYPES[structure]
  if (structInfo) {
    lines.push(`字形为${structInfo.name}结构——${structInfo.desc}。`)
    const structFortune = STRUCTURE_FORTUNE[structure]
    if (structFortune) {
      lines.push(structFortune)
    }
  }

  // Closing summary
  lines.push(generateClosing(numberFortune.category, primaryElement, structureName))

  return lines.join('\n')
}

/** Generate a note about the interaction between two elements */
function getElementInteractionNote(primary: string, radical: string): string {
  const generating: Record<string, string> = {
    '木火': '木生火，偏旁木性生助数理火性，此为相生之象。字形与数理相得益彰，运势更佳。',
    '火土': '火生土，偏旁火性生助数理土性，此为相生之象。热情归于稳重，内蕴深厚力量。',
    '土金': '土生金，偏旁土性生助数理金性，此为相生之象。厚德载物，必有所成。',
    '金水': '金生水，偏旁金性生助数理水性，此为相生之象。刚柔并济，智慧通达。',
    '水木': '水生木，偏旁水性生助数理木性，此为相生之象。智慧滋养生机，前途光明。',
    '木土': '木克土，偏旁木性与数理土性相克。字形生克制衡，提示您在发展中需注意根基稳固与外在生长之间的平衡。',
    '土水': '土克水，偏旁土性与数理水性相克。稳重之中或有限制之象，宜适当变通，不可过于保守。',
    '水火': '水克火，偏旁水性与数理火性相克。热情与智慧之间需调和，避免冲动亦不可过于冷静。',
    '火金': '火克金，偏旁火性与数理金性相克。果断与热情相冲，宜以中庸之道化解矛盾。',
    '金木': '金克木，偏旁金性与数理木性相克。刚强之中须留柔和，事业拓展中注意柔克之道。',
  }
  return generating[primary + radical] || generating[radical + primary] || `偏旁${radical}性与数理${primary}性相互作用，宜调和两性之理。`
}

/** Generate the closing summary paragraph */
function generateClosing(category: string, element: string, structureName: string): string {
  const elementPhrases: Record<string, string> = {
    '木': '木性生发，如同春回大地。',
    '火': '火性光明，如同日照中天。',
    '土': '土性厚重，如同坤元载物。',
    '金': '金性坚刚，如同金石之贞。',
    '水': '水性润下，如同上善若水。',
  }

  const opening = elementPhrases[element] || `${element}性本自天地。`

  let wordPhrase = ''
  if (category === '大吉') {
    wordPhrase = '此字数理大吉，字形结构得当，五行之气流通无碍。诚为佳兆，万事可期。'
  } else if (category === '吉') {
    wordPhrase = '此字数理吉祥，虽有微瑕，无伤大体。顺势而为，必有所获。'
  } else if (category === '半吉') {
    wordPhrase = '此字数理中平，吉凶参半。宜察时度势，趋吉避凶。中和之道为上策。'
  } else {
    wordPhrase = '此字数理欠佳，然字由心生，心可改字。修身养性，存善念、行善事，自可转吉为凶。'
  }

  return `总而言之：${opening}${wordPhrase}测字之学，观一字而窥天机。然天机虽可测，命运终由己握。善心善行，方为根本。`
}

// ── Main Analysis Function ────────────────────────────

/**
 * Analyze a single Chinese character for divination.
 *
 * Returns a full CeziResult, or null if the input is not a valid CJK character.
 */
export function analyzeCharacter(char: string): CeziResult | null {
  // Normalize: trim whitespace first
  const trimmed = char.trim()
  if (trimmed.length === 0) return null

  // Validate: must be a single CJK character
  if (!isCJKChar(trimmed)) return null

  // Stroke count
  let strokeCount: number
  let strokeSource: 'dictionary' | 'estimated'

  const dictStrokes = getStrokeCount(trimmed)
  if (dictStrokes !== null && dictStrokes > 0) {
    strokeCount = dictStrokes
    strokeSource = 'dictionary'
  } else {
    // Fallback estimation — same formula as stroke-dict.ts for consistency
    const cp = trimmed.codePointAt(0) || 0x4E00
    if (cp >= 0x20000 && cp <= 0x2FA1F) {
      strokeCount = Math.floor((cp - 0x20000) / 50) + 3
    } else {
      strokeCount = Math.floor((cp - 0x4E00) / 30) + 3
    }
    strokeSource = 'estimated'
  }

  // Number fortune
  const numberFortune = getNumberFortune(strokeCount)

  // Primary element from stroke count
  const primaryElement = getWuxingFromNumber(strokeCount)

  // Radical element detection
  const radicalElement = detectRadicalElement(trimmed)

  // Structure detection
  const structure = detectStructure(trimmed)
  const structInfo = STRUCTURE_TYPES[structure]
  const structureName = structInfo?.name || '独体'
  const structureDesc = structInfo?.desc || '独立自主，个性鲜明'

  // Build result (without interpretation first)
  const partial: Omit<CeziResult, 'interpretation'> = {
    character: trimmed,
    strokeCount,
    strokeSource,
    numberFortune,
    primaryElement,
    radicalElement,
    structure,
    structureName,
    structureDesc,
  }

  // Generate interpretation
  const interpretation = generateInterpretation(partial)

  return {
    ...partial,
    interpretation,
  }
}
