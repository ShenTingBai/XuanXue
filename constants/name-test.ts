// ── 姓名测试 · 五格剖象法 ──────────────────────────────────
//
// 数据来源：熊崎健翁五格剖象法，81数理吉凶表
// 三才配置吉凶参考自传统姓名学文献

// ════════════════════════════════════════
// 81 数理吉凶表
// ════════════════════════════════════════

export interface NumberMeaning {
  number: number
  fortune: '吉' | '凶' | '半吉'
  name: string
  meaning: string
}

export const NUMBERS_81: NumberMeaning[] = [
  { number: 1, fortune: '吉', name: '太极之数', meaning: '万物开泰，生发无穷，利禄亨通。' },
  { number: 2, fortune: '凶', name: '两仪之数', meaning: '混沌未开，进退保守，志望难达。' },
  { number: 3, fortune: '吉', name: '三才之数', meaning: '天地人和，大事大业，繁荣昌隆。' },
  { number: 4, fortune: '凶', name: '四象之数', meaning: '四象不定，身体弱苦，须防灾厄。' },
  { number: 5, fortune: '吉', name: '五行之数', meaning: '五行俱全，循环生克，福祉无穷。' },
  { number: 6, fortune: '吉', name: '六爻之数', meaning: '安稳余庆，吉人天相，祥瑞柔和。' },
  { number: 7, fortune: '吉', name: '七政之数', meaning: '刚毅果断，勇往直前，必获成功。' },
  { number: 8, fortune: '吉', name: '八卦之数', meaning: '智谋超群，财利丰盈，功名可望。' },
  { number: 9, fortune: '凶', name: '大成之数', meaning: '大成之数，蕴涵凶险，难以把握。' },
  { number: 10, fortune: '凶', name: '终结之数', meaning: '雪暗飘零，空费心力，回顾茫然。' },
  { number: 11, fortune: '吉', name: '旱苗逢雨', meaning: '万物更新，调顺发达，安详尊荣。' },
  { number: 12, fortune: '凶', name: '掘井无泉', meaning: '无理之数，薄弱无力，谋事难成。' },
  { number: 13, fortune: '吉', name: '春日牡丹', meaning: '智谋超群，四方财聚，名闻天下。' },
  { number: 14, fortune: '凶', name: '破败之数', meaning: '泪流如雨，孤寂烦闷，事不如意。' },
  { number: 15, fortune: '吉', name: '福寿双全', meaning: '福寿圆满，涵养雅量，德高望重。' },
  { number: 16, fortune: '吉', name: '厚重之数', meaning: '厚重载德，安富尊荣，地位显赫。' },
  { number: 17, fortune: '吉', name: '刚强之数', meaning: '权威刚强，突破万难，可成大业。' },
  { number: 18, fortune: '吉', name: '有志竟成', meaning: '有志竟成，智勇双全，排除万难。' },
  { number: 19, fortune: '凶', name: '风云蔽月', meaning: '短暂明月，辛苦叠来，虽有智谋，万事挫折。' },
  { number: 20, fortune: '凶', name: '非业破运', meaning: '非业破运，灾难不安，百事难成。' },
  { number: 21, fortune: '吉', name: '明月中天', meaning: '光风霁月，大业有成，首领之数。' },
  { number: 22, fortune: '凶', name: '秋草逢霜', meaning: '秋草逢霜，怀才不遇，忧愁怨苦。' },
  { number: 23, fortune: '吉', name: '壮丽之数', meaning: '旭日东升，气势壮丽，至吉之数。' },
  { number: 24, fortune: '吉', name: '掘藏得金', meaning: '家门余庆，金钱丰盈，白手成家。' },
  { number: 25, fortune: '吉', name: '英俊之数', meaning: '资性英敏，刚毅果断，可成伟业。' },
  { number: 26, fortune: '凶', name: '变怪之数', meaning: '变怪之谜，英雄豪杰，波澜重叠。' },
  { number: 27, fortune: '凶', name: '增长之数', meaning: '欲望无止，自我强烈，多受诽谤。' },
  { number: 28, fortune: '凶', name: '阔水浮萍', meaning: '遭难之数，豪杰气概，四海漂泊。' },
  { number: 29, fortune: '吉', name: '青云直上', meaning: '智谋兼备，才略奏功，大业成就。' },
  { number: 30, fortune: '凶', name: '浮沉不定', meaning: '浮沉不定，吉凶难分，好运不长。' },
  { number: 31, fortune: '吉', name: '智勇兼备', meaning: '智勇兼备，可成大业，名扬四海。' },
  { number: 32, fortune: '吉', name: '侥幸之数', meaning: '幸运多望，贵人得助，财帛丰裕。' },
  { number: 33, fortune: '吉', name: '升天之家', meaning: '家门隆昌，威望隆重，祥瑞之数。' },
  { number: 34, fortune: '凶', name: '破家之数', meaning: '破家之身，见识短小，辛苦遭逢。' },
  { number: 35, fortune: '吉', name: '温和之数', meaning: '温和礼让，智达通畅，文昌技艺。' },
  { number: 36, fortune: '凶', name: '波澜重叠', meaning: '波澜重叠，沉浮万状，侠肝义胆。' },
  { number: 37, fortune: '吉', name: '猛虎出林', meaning: '权威显达，热诚忠信，宜着雅量。' },
  { number: 38, fortune: '凶', name: '磨铁成针', meaning: '意志薄弱，刻意经营，才识不凡。' },
  { number: 39, fortune: '吉', name: '富贵荣华', meaning: '富贵荣华，财帛丰盈，德泽四方。' },
  { number: 40, fortune: '凶', name: '退安之数', meaning: '智谋胆力，冒险投机，沉浮不定。' },
  { number: 41, fortune: '吉', name: '德望高大', meaning: '纯阳独秀，德望高大，和顺畅达。' },
  { number: 42, fortune: '凶', name: '寒蝉在柳', meaning: '博识多能，精通世情，如寒蝉在柳。' },
  { number: 43, fortune: '凶', name: '散财之数', meaning: '须防邪途，散财破产，外祥内苦。' },
  { number: 44, fortune: '凶', name: '须眉难展', meaning: '须眉难展，暗中奋斗，遭难不遇。' },
  { number: 45, fortune: '吉', name: '顺风之船', meaning: '顺风之船，新生泰运，智谋经纬。' },
  { number: 46, fortune: '凶', name: '乱丝无头', meaning: '坎坷不平，艰难重重，如无头乱丝。' },
  { number: 47, fortune: '吉', name: '点石成金', meaning: '点石成金，花开之象，万事如意。' },
  { number: 48, fortune: '吉', name: '德望之数', meaning: '德望兼备，才谋出众，可享清福。' },
  { number: 49, fortune: '凶', name: '吉凶难分', meaning: '吉凶难分，利害混集，须防大厄。' },
  { number: 50, fortune: '凶', name: '船行险滩', meaning: '一成一败，吉凶参半，万事难周全。' },
  { number: 51, fortune: '凶', name: '盛衰交加', meaning: '盛衰交加，波澜重叠，沉浮不定。' },
  { number: 52, fortune: '吉', name: '达眼之数', meaning: '卓识达眼，先见之明，名利双收。' },
  { number: 53, fortune: '凶', name: '忧愁困苦', meaning: '外观昌隆，内隐祸患，忧苦难言。' },
  { number: 54, fortune: '凶', name: '石上栽花', meaning: '石上栽花，难得成活，辛苦无成。' },
  { number: 55, fortune: '吉', name: '善恶之数', meaning: '善善恶恶，吉凶参半，须防投机。' },
  { number: 56, fortune: '凶', name: '浪里行舟', meaning: '浪里行舟，历尽艰辛，失败多端。' },
  { number: 57, fortune: '吉', name: '日照春松', meaning: '寒雪青松，夜莺啼春，福禄并至。' },
  { number: 58, fortune: '凶', name: '晚行遇月', meaning: '晚行遇月，先苦后甘，宽宏扬名。' },
  { number: 59, fortune: '凶', name: '寒蝉悲风', meaning: '寒蝉悲风，意志衰退，缺乏持久。' },
  { number: 60, fortune: '凶', name: '无谋之数', meaning: '无谋之人，漂泊不定，晦暗摇动。' },
  { number: 61, fortune: '吉', name: '牡丹芙蓉', meaning: '牡丹芙蓉，名利双收，定得幸福。' },
  { number: 62, fortune: '凶', name: '衰败之数', meaning: '衰败之数，内外不和，志望难达。' },
  { number: 63, fortune: '吉', name: '富贵荣华', meaning: '富贵荣华，身心安泰，雨露惠泽。' },
  { number: 64, fortune: '凶', name: '非命之数', meaning: '骨肉分离，孤独悲愁，徒劳无功。' },
  { number: 65, fortune: '吉', name: '荣华之数', meaning: '天长地久，家运隆昌，健康长寿。' },
  { number: 66, fortune: '凶', name: '不和之数', meaning: '不和之数，进退维谷，万事难成。' },
  { number: 67, fortune: '吉', name: '通达之数', meaning: '事事通达，功成名就，财禄丰盈。' },
  { number: 68, fortune: '吉', name: '发明之数', meaning: '发明智谋，力臻通达，志望达成。' },
  { number: 69, fortune: '凶', name: '非业之数', meaning: '非业非力，精神不安，缺乏实权。' },
  { number: 70, fortune: '凶', name: '弃世之数', meaning: '废弃之数，命运多舛，险恶亡身。' },
  { number: 71, fortune: '凶', name: '吉凶参半', meaning: '吉凶参半，缺乏耐久，劳而无功。' },
  { number: 72, fortune: '凶', name: '劳苦之数', meaning: '劳苦之数，阴云蔽月，志望难达。' },
  { number: 73, fortune: '凶', name: '无勇之数', meaning: '盛衰交加，徒有高志，难成大事。' },
  { number: 74, fortune: '凶', name: '残菊经霜', meaning: '残菊经霜，秋叶凋零，事不如意。' },
  { number: 75, fortune: '凶', name: '退守之数', meaning: '退守保吉，妄动招灾，宜守静待时。' },
  { number: 76, fortune: '凶', name: '倾覆之数', meaning: '倾覆之数，破产之象，内外不合。' },
  { number: 77, fortune: '凶', name: '半吉之数', meaning: '家庭有悦，半凶半吉，需防灾厄。' },
  { number: 78, fortune: '凶', name: '晚境凄凉', meaning: '祸福参半，智能可用，晚境凄凉。' },
  { number: 79, fortune: '凶', name: '云遮半月', meaning: '云遮半月，暗藏凶险，需防小人。' },
  { number: 80, fortune: '凶', name: '遁迹之数', meaning: '遁迹之数，辛苦不绝，一生无成。' },
  { number: 81, fortune: '吉', name: '万物回春', meaning: '万物回春，还本归元，最吉之数。' },
]

export const NUMBER_MAP = new Map(NUMBERS_81.map(n => [n.number, n]))

/** 获取数理 */
export function getNumberMeaning(num: number): NumberMeaning {
  // 81 以上取个位数+循环；仅 1-81 有定义
  const key = num > 81 ? ((num - 1) % 81 + 1) : num
  return NUMBER_MAP.get(key) || NUMBERS_81[0]
}

// ════════════════════════════════════════
// 五行属性配数
// ════════════════════════════════════════

export function getNumberWuxing(num: number): string {
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

// ════════════════════════════════════════
// 三才配置吉凶判断（天格·人格·地格五行组合）
// ════════════════════════════════════════

const WUXING_CYCLE = ['木', '火', '土', '金', '水']

export function getSanCaiFortune(tian: string, ren: string, di: string): '吉' | '凶' | '半吉' {
  // 相生关系
  const genIdx = (w: string) => WUXING_CYCLE.indexOf(w)
  const isGenerate = (a: string, b: string) => {
    const ia = genIdx(a), ib = genIdx(b)
    return ia >= 0 && ib >= 0 && (ib === (ia + 1) % 5 || ib === (ia + 3) % 5) // 生或反生
  }

  // 天→人 生则吉，克则凶
  const tianToRen = isGenerate(tian, ren) ? '吉' : (isGenerate(ren, tian) ? '半吉' : '凶')
  // 人→地 生则吉，克则凶
  const renToDi = isGenerate(ren, di) ? '吉' : (isGenerate(di, ren) ? '半吉' : '凶')

  if (tianToRen === '吉' && renToDi === '吉') return '吉'
  if (tianToRen === '凶' || renToDi === '凶') return '凶'
  return '半吉'
}

// ════════════════════════════════════════
// 数理分类表
// ════════════════════════════════════════

export interface CategoryInfo {
  label: string
  numbers: number[]
}

export const NUMBER_CATEGORIES: CategoryInfo[] = [
  { label: '首领运', numbers: [3, 13, 16, 21, 23, 29, 31, 37, 39, 41, 45, 47] },
  { label: '财富运', numbers: [15, 16, 24, 29, 32, 33, 41, 52] },
  { label: '才能运', numbers: [13, 14, 18, 26, 29, 33, 35, 38, 48] },
  { label: '温和运', numbers: [5, 6, 11, 15, 16, 24, 31, 32, 35] },
  { label: '女德运', numbers: [5, 6, 11, 13, 15, 16, 24, 32, 35] },
  { label: '孤寡运', numbers: [21, 23, 26, 28, 29, 33, 39] },
  { label: '刚情运', numbers: [7, 17, 18, 25, 27, 28, 37, 47] },
]

export function getNumberCategories(num: number): string[] {
  return NUMBER_CATEGORIES.filter(c => c.numbers.includes(num)).map(c => c.label)
}

// ════════════════════════════════════════
// 评分计算
// ════════════════════════════════════════

export function calculateNameScore(
  tienFortune: '吉' | '凶' | '半吉',
  renFortune: '吉' | '凶' | '半吉',
  diFortune: '吉' | '凶' | '半吉',
  totalFortune: '吉' | '凶' | '半吉',
  waiFortune: '吉' | '凶' | '半吉',
  sanCaiFortune: '吉' | '凶' | '半吉',
): number {
  const fortuneScore = (f: '吉' | '凶' | '半吉') => f === '吉' ? 20 : f === '半吉' ? 10 : 0
  const sanCaiScore = sanCaiFortune === '吉' ? 20 : sanCaiFortune === '半吉' ? 8 : 0

  const scores = [
    fortuneScore(tienFortune),
    fortuneScore(renFortune),
    fortuneScore(diFortune),
    fortuneScore(totalFortune),
    fortuneScore(waiFortune),
    sanCaiScore,
  ]
  // 人格双倍权重
  const renScore = renFortune === '吉' ? 20 : renFortune === '半吉' ? 10 : 0

  const total = scores.reduce((a, b) => a + b, 0) + renScore
  return Math.max(0, Math.min(100, total))
}
