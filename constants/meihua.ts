// ═══════════════════════════════════════════════════════════════
// 梅花易数 · 常数数据
// ═══════════════════════════════════════════════════════════════

import {
  HEXAGRAM_NAMES as YJ_NAMES,
  HEXAGRAM_JUDGMENTS as YJ_JUDGMENTS,
  LINE_JUDGMENTS as YJ_LINES,
} from './yijing-hexagrams'

export interface TrigramInfo {
  name: string
  symbol: string
  wuxing: string
  direction: string
  nature: string
  traits: string[]
  body: string[]
  family: string
  animal: string[]
}

export const MEIHUA_TRIGRAM_BINARY: Record<number, number> = {
  1: 7,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 0,
}

export const BINARY_TO_MEIHUA: Record<number, number> = {
  7: 1,
  6: 2,
  5: 3,
  4: 4,
  3: 5,
  2: 6,
  1: 7,
  0: 8,
}

export const MEIHUA_TO_YJ_INDEX: Record<number, number> = {
  1: 7,
  2: 3,
  3: 5,
  4: 1,
  5: 6,
  6: 2,
  7: 4,
  8: 0,
}

export const TRIGRAMS: Record<number, TrigramInfo> = {
  1: {
    name: '乾',
    symbol: '☰',
    wuxing: '金',
    direction: '西北',
    nature: '天',
    traits: ['刚健', '勇猛'],
    body: ['头', '骨'],
    family: '父',
    animal: ['马', '龙'],
  },
  2: {
    name: '兑',
    symbol: '☱',
    wuxing: '金',
    direction: '西',
    nature: '泽',
    traits: ['喜悦', '口舌'],
    body: ['口', '肺'],
    family: '少女',
    animal: ['羊'],
  },
  3: {
    name: '离',
    symbol: '☲',
    wuxing: '火',
    direction: '南',
    nature: '火',
    traits: ['明亮', '文采'],
    body: ['目', '心'],
    family: '中女',
    animal: ['雉', '龟'],
  },
  4: {
    name: '震',
    symbol: '☳',
    wuxing: '木',
    direction: '东',
    nature: '雷',
    traits: ['震动', '奋起'],
    body: ['足', '肝'],
    family: '长男',
    animal: ['龙'],
  },
  5: {
    name: '巽',
    symbol: '☴',
    wuxing: '木',
    direction: '东南',
    nature: '风',
    traits: ['柔顺', '进入'],
    body: ['股', '胆'],
    family: '长女',
    animal: ['鸡'],
  },
  6: {
    name: '坎',
    symbol: '☵',
    wuxing: '水',
    direction: '北',
    nature: '水',
    traits: ['险陷', '智慧'],
    body: ['耳', '肾'],
    family: '中男',
    animal: ['猪'],
  },
  7: {
    name: '艮',
    symbol: '☶',
    wuxing: '土',
    direction: '东北',
    nature: '山',
    traits: ['静止', '稳固'],
    body: ['手', '胃'],
    family: '少男',
    animal: ['狗'],
  },
  8: {
    name: '坤',
    symbol: '☷',
    wuxing: '土',
    direction: '西南',
    nature: '地',
    traits: ['柔顺', '包容'],
    body: ['腹', '脾'],
    family: '母',
    animal: ['牛'],
  },
}

// ============================
// 六十四卦 (64 Hexagrams) — 卦名 + 卦辞 + 白话解读
// ============================

/** 六十四卦名称查找表（按编号组合"upper:lower"） */
export const HEXAGRAM_NAMES_BY_KEY: Record<string, string> = {}
/** 六十四卦卦辞查找表（按编号组合"upper:lower"） */
export const HEXAGRAM_JUDGMENTS_BY_KEY: Record<string, string> = {}
function _buildHexLookups() {
  const yjMap: Record<number, number> = { 1: 7, 2: 3, 3: 5, 4: 1, 5: 6, 6: 2, 7: 4, 8: 0 }
  for (let u = 1; u <= 8; u++) {
    for (let l = 1; l <= 8; l++) {
      const key = u + ':' + l
      const yjKey = yjMap[u] + '_' + yjMap[l]
      HEXAGRAM_NAMES_BY_KEY[key] = YJ_NAMES[yjKey] || ''
      HEXAGRAM_JUDGMENTS_BY_KEY[key] = YJ_JUDGMENTS[yjKey] || ''
    }
  }
}
_buildHexLookups()

/** 六十四卦：完整数据（名称、卦辞、白话解读） */
export const HEXAGRAMS: Record<string, { name: string; judgment: string; interpretation: string }> =
  {
    '1:1': {
      name: '乾为天',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:1'],
      interpretation: '乾卦象征天，刚健自强。此卦大吉，君子以自强不息，勇往直前则万事可成。',
    },
    '1:2': {
      name: '天泽履',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:2'],
      interpretation: '履卦象征履行礼仪，如履虎尾。此卦主谨慎行事，循礼而行则可化险为夷。',
    },
    '1:3': {
      name: '天火同人',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:3'],
      interpretation: '同人卦象征团结同心。此卦主与人合作可成大事，利于公正公开地处理事务。',
    },
    '1:4': {
      name: '天雷无妄',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:4'],
      interpretation: '无妄卦象征不妄为。此卦主顺其自然，不存非分之想，守持正固则可获吉祥。',
    },
    '1:5': {
      name: '天风姤',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:5'],
      interpretation: '姤卦象征相遇。此卦主机缘巧合，不期而遇，但需审慎判断，防不当之遇。',
    },
    '1:6': {
      name: '天水讼',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:6'],
      interpretation: '讼卦象征争讼。此卦主干戈相争，宜和为贵，不宜诉讼，适可而止则吉。',
    },
    '1:7': {
      name: '天山遁',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:7'],
      interpretation: '遁卦象征退避。此卦主形势不利，宜暂退守势，保存实力，静待时机。',
    },
    '1:8': {
      name: '天地否',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['1:8'],
      interpretation: '否卦象征闭塞不通。此卦主天地不交，诸事不顺，宜静守待机，不可妄动。',
    },
    '2:1': {
      name: '泽天夬',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:1'],
      interpretation: '夬卦象征决断。此卦主果断行动，当断则断，清除障碍，但需周全谋划。',
    },
    '2:2': {
      name: '兑为泽',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:2'],
      interpretation: '兑卦象征泽，喜悦。此卦主愉悦沟通，朋友相聚，利于社交，但需防口舌是非。',
    },
    '2:3': {
      name: '泽火革',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:3'],
      interpretation: '革卦象征变革。此卦主破旧立新，除旧布新之时，虽有阵痛但前景光明。',
    },
    '2:4': {
      name: '泽雷随',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:4'],
      interpretation: '随卦象征随从。此卦主顺势而为，随机应变，跟随正道则万事亨通。',
    },
    '2:5': {
      name: '泽风大过',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:5'],
      interpretation: '大过卦象征大有过越。此卦主力不从心，需量力而行，不宜冒进，谨慎可保无虞。',
    },
    '2:6': {
      name: '泽水困',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:6'],
      interpretation: '困卦象征困境。此卦主陷入困难，处境艰难，需坚守正道，安守本分以待转机。',
    },
    '2:7': {
      name: '泽山咸',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:7'],
      interpretation: '咸卦象征感应。此卦主感情沟通，男女之事吉，诚心相感则万事可成。',
    },
    '2:8': {
      name: '泽地萃',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['2:8'],
      interpretation: '萃卦象征聚集。此卦主人才汇聚，群英荟萃，团结一致则万事可成。',
    },
    '3:1': {
      name: '火天大有',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:1'],
      interpretation: '大有卦象征大获所有。此卦主丰盛收获，光明普照，万事亨通，大吉大利。',
    },
    '3:2': {
      name: '火泽睽',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:2'],
      interpretation: '睽卦象征乖离。此卦主意见分歧，立场相左，小事可成，大事宜谨慎处理。',
    },
    '3:3': {
      name: '离为火',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:3'],
      interpretation: '离卦象征火与光明。此卦主文明礼敬，依附光明，柔顺中正则吉。',
    },
    '3:4': {
      name: '火雷噬嗑',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:4'],
      interpretation: '噬嗑卦象征咬合。此卦主克服障碍，排除万难，用刑狱之事吉，利于审断。',
    },
    '3:5': {
      name: '火风鼎',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:5'],
      interpretation: '鼎卦象征鼎器。此卦主鼎新革故，建立新秩序，大吉大利，万事亨通。',
    },
    '3:6': {
      name: '火水未济',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:6'],
      interpretation: '未济卦象征未完成。此卦主事物尚未成功，需谨始慎终，不可半途而废。',
    },
    '3:7': {
      name: '火山旅',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:7'],
      interpretation: '旅卦象征旅行。此卦主在外漂泊，居无定所，小事可成，宜守持正固。',
    },
    '3:8': {
      name: '火地晋',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['3:8'],
      interpretation: '晋卦象征前进晋升。此卦主事业进步，光明在前，受赏晋升，蒸蒸日上。',
    },
    '4:1': {
      name: '雷天大壮',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:1'],
      interpretation: '大壮卦象征盛大强壮。此卦主力量强盛，正气凛然，但不宜妄动，宜守正。',
    },
    '4:2': {
      name: '雷泽归妹',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:2'],
      interpretation: '归妹卦象征少女出嫁。此卦主婚姻结合，但征伐则凶，宜顺其自然。',
    },
    '4:3': {
      name: '雷火丰',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:3'],
      interpretation: '丰卦象征丰盛盈满。此卦主事业鼎盛，光明通达，但盛极必衰，需居安思危。',
    },
    '4:4': {
      name: '震为雷',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:4'],
      interpretation: '震卦象征雷震。此卦主惊雷震动，临危不乱则可化险为夷，镇定自若则吉。',
    },
    '4:5': {
      name: '雷风恒',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:5'],
      interpretation: '恒卦象征恒久。此卦主持之以恒，稳定发展，夫妇之道恒久则吉。',
    },
    '4:6': {
      name: '雷水解',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:6'],
      interpretation: '解卦象征解脱。此卦主困难解除，危机化解，宜积极行动，把握良机。',
    },
    '4:7': {
      name: '雷山小过',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:7'],
      interpretation: '小过卦象征小有过度。此卦主小事可成，不宜大事，宜谦下不宜高飞。',
    },
    '4:8': {
      name: '雷地豫',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['4:8'],
      interpretation: '豫卦象征愉悦安乐。此卦主安和乐悦，利于建立诸侯和行军用兵。',
    },
    '5:1': {
      name: '风天小畜',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:1'],
      interpretation: '小畜卦象征小有积蓄。此卦主蓄势待发，密云不雨，需耐心等待时机。',
    },
    '5:2': {
      name: '风泽中孚',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:2'],
      interpretation: '中孚卦象征内心诚信。此卦主诚信感化万物，中正诚信则即使涉险亦吉。',
    },
    '5:3': {
      name: '风火家人',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:3'],
      interpretation: '家人卦象征家庭。此卦主家庭和睦，各安其位，女主内则吉。',
    },
    '5:4': {
      name: '风雷益',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:4'],
      interpretation: '益卦象征增益。此卦主有益之事，利于行动和涉险，付出必有回报。',
    },
    '5:5': {
      name: '巽为风',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:5'],
      interpretation: '巽卦象征风与顺入。此卦主柔顺谦逊，善于顺势而为，利于见大人。',
    },
    '5:6': {
      name: '风水涣',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:6'],
      interpretation: '涣卦象征涣散。此卦主离散之后重新聚合，人心涣散需重新凝聚力量。',
    },
    '5:7': {
      name: '风山渐',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:7'],
      interpretation: '渐卦象征渐进。此卦主循序渐进，不可急躁，女子出嫁吉，宜稳步前行。',
    },
    '5:8': {
      name: '风地观',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['5:8'],
      interpretation: '观卦象征观察审视。此卦主观察民情，以德服人，诚信示人则天下服。',
    },
    '6:1': {
      name: '水天需',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:1'],
      interpretation: '需卦象征等待。此卦主需耐心等待时机，诚信则光明亨通，利于涉险。',
    },
    '6:2': {
      name: '水泽节',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:2'],
      interpretation: '节卦象征节制。此卦主适度节制，合理规划则亨通，过度节制不可长久。',
    },
    '6:3': {
      name: '水火既济',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:3'],
      interpretation: '既济卦象征已完成。此卦主事已成功，大局已定，但初吉终乱，需谨慎守成。',
    },
    '6:4': {
      name: '水雷屯',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:4'],
      interpretation: '屯卦象征初创艰难。此卦主万事开头难，需坚定意志，利于建侯立业。',
    },
    '6:5': {
      name: '水风井',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:5'],
      interpretation: '井卦象征水井。此卦主守成供养，改邑不改井，安守本分，绵绵不绝。',
    },
    '6:6': {
      name: '坎为水',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:6'],
      interpretation: '坎卦象征险陷。此卦主重重险难，但有诚信则心志亨通，行动必有嘉奖。',
    },
    '6:7': {
      name: '水山蹇',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:7'],
      interpretation: '蹇卦象征艰难。此卦主前路险阻，宜见大人寻求帮助，不宜冒进。',
    },
    '6:8': {
      name: '水地比',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['6:8'],
      interpretation: '比卦象征亲比。此卦主亲附团结，相亲相辅，众人一心则万事大吉。',
    },
    '7:1': {
      name: '山天大畜',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:1'],
      interpretation: '大畜卦象征大积蓄。此卦主蓄积才德，厚积薄发，利于涉险，前程光明。',
    },
    '7:2': {
      name: '山泽损',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:2'],
      interpretation: '损卦象征减损。此卦主有所损失，但有诚信则终获吉祥，损己利人亦有回报。',
    },
    '7:3': {
      name: '山火贲',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:3'],
      interpretation: '贲卦象征装饰。此卦主文饰外表，增添光彩，小事可成，重内涵更重于外表。',
    },
    '7:4': {
      name: '山雷颐',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:4'],
      interpretation: '颐卦象征颐养。此卦主养生养德，自力更生，自求口实则吉。',
    },
    '7:5': {
      name: '山风蛊',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:5'],
      interpretation: '蛊卦象征腐败。此卦主整治弊病，拯弊治乱，拨乱反正，利于涉险。',
    },
    '7:6': {
      name: '山水蒙',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:6'],
      interpretation: '蒙卦象征蒙昧。此卦主启蒙教育，求教于师，虚心学习则吉。',
    },
    '7:7': {
      name: '艮为山',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:7'],
      interpretation: '艮卦象征山，静止。此卦主知止而后定，适可而止，动静不失其时则吉。',
    },
    '7:8': {
      name: '山地剥',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['7:8'],
      interpretation: '剥卦象征剥落衰落。此卦主衰落剥蚀，阴盛阳衰，不利于行动，宜静守。',
    },
    '8:1': {
      name: '地天泰',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:1'],
      interpretation: '泰卦象征通泰。此卦主天地交泰，万物通达，上下交融，大吉大利。',
    },
    '8:2': {
      name: '地泽临',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:2'],
      interpretation: '临卦象征君临。此卦主临事而治，以上临下，进展顺利，但需防盛极而衰。',
    },
    '8:3': {
      name: '地火明夷',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:3'],
      interpretation: '明夷卦象征光明受伤。此卦主暗弱之时，君子隐忍，利于在艰难中守正。',
    },
    '8:4': {
      name: '地雷复',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:4'],
      interpretation: '复卦象征回复。此卦主一阳来复，生机重现，冬去春来，利于行动。',
    },
    '8:5': {
      name: '地风升',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:5'],
      interpretation: '升卦象征上升。此卦主步步高升，前途光明，积小成高大，利于见大人。',
    },
    '8:6': {
      name: '地水师',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:6'],
      interpretation: '师卦象征军队。此卦主聚众出征，行军打仗，需有德者统领则吉。',
    },
    '8:7': {
      name: '地山谦',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:7'],
      interpretation: '谦卦象征谦虚。此卦主谦逊受益，虚怀若谷，君子有终，万事大吉。',
    },
    '8:8': {
      name: '坤为地',
      judgment: HEXAGRAM_JUDGMENTS_BY_KEY['8:8'],
      interpretation: '坤卦象征地，柔顺包容。此卦主厚德载物，安顺守成，宜静不宜动。',
    },
  }

// ============================
// 爻辞 (Line statements) — keyed by meihua hexagram key "upper:lower"
// Built from existing Yijing line judgment data
// ============================

const _LINE_STATEMENTS_BUILDER: Record<string, string[]> = {}
function _buildLineStatements() {
  const yjMap: Record<number, number> = { 1: 7, 2: 3, 3: 5, 4: 1, 5: 6, 6: 2, 7: 4, 8: 0 }
  for (let u = 1; u <= 8; u++) {
    for (let l = 1; l <= 8; l++) {
      const key = u + ':' + l
      const yjKey = yjMap[u] + '_' + yjMap[l]
      const name = YJ_NAMES[yjKey]
      const lines = YJ_LINES[name]
      if (lines) {
        _LINE_STATEMENTS_BUILDER[key] = lines.slice()
      }
    }
  }
}
_buildLineStatements()

/** 爻辞：按六十四卦和爻位（0=初爻, 5=上爻） */
export const LINE_STATEMENTS: Record<string, string[]> = _LINE_STATEMENTS_BUILDER

/**
 * Get the line statement for a specific hexagram and line position.
 * @param hexagramKey - "upper:lower" format
 * @param lineIndex - 0-5 (0=bottom/first line, 5=top/sixth line)
 */
export function getLineStatement(hexagramKey: string, lineIndex: number): string {
  const lines = LINE_STATEMENTS[hexagramKey]
  if (lines && lineIndex >= 0 && lineIndex < lines.length) {
    return lines[lineIndex]
  }
  return ''
}

// ============================
// 五行生克 (Wuxing cycle) helpers
// ============================

const WUXING_GENERATION: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

const WUXING_CONTROL: Record<string, string> = {
  木: '土',
  火: '金',
  土: '水',
  金: '木',
  水: '火',
}

export function getWuxingGenerated(wx: string): string {
  return WUXING_GENERATION[wx] || ''
}

export function getWuxingControlled(wx: string): string {
  return WUXING_CONTROL[wx] || ''
}

// ============================
// 体用生克解释 (Body-Use interaction interpretations)
// Key format: "体卦五行:用卦五行"
// ============================

const SHENG_KE_BASE: Record<string, { result: string; description: string }> = {
  比和: {
    result: '比和',
    description: '体卦与用卦五行相同，比和之象。主事态和谐，内外一致，双方同心协力，谋事易成。',
  },
  体生用: {
    result: '体生用',
    description:
      '体卦生用卦，为我生者之象。主需付出较多精力，主动施予，虽暂时耗气但局面可控，长远有利。',
  },
  用生体: {
    result: '用生体',
    description: '用卦生体卦，为生我者之象。主得天时地利，有外力相助，贵人扶持，最为吉祥。',
  },
  体克用: {
    result: '体克用',
    description: '体卦克用卦，为我克者之象。主我占优势，能够掌控局面，虽有阻力但终可克服。',
  },
  用克体: {
    result: '用克体',
    description: '用卦克体卦，为克我者之象。主受制于人，外部压力较大，诸事宜谨慎，不宜冒进。',
  },
}

function _buildShengKe() {
  const WX = ['木', '火', '土', '金', '水']
  const result: Record<string, { result: string; description: string }> = {}
  for (let ti = 0; ti < WX.length; ti++) {
    for (let yo = 0; yo < WX.length; yo++) {
      const t = WX[ti]
      const y = WX[yo]
      var key = t + ':' + y
      let r: string
      if (t === y) {
        r = '比和'
      } else if (getWuxingGenerated(t) === y) {
        r = '体生用'
      } else if (getWuxingGenerated(y) === t) {
        r = '用生体'
      } else if (getWuxingControlled(t) === y) {
        r = '体克用'
      } else {
        r = '用克体'
      }
      result[key] = { result: SHENG_KE_BASE[r].result, description: SHENG_KE_BASE[r].description }
    }
  }
  return result
}

/** 体用生克解释：五行组合的吉凶判读 */
export const SHENG_KE_INTERPRETATIONS: Record<string, { result: string; description: string }> =
  _buildShengKe()
