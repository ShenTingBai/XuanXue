// ── 本命佛 / 生肖守护神 ────────────────────────────────────
//
// 数据来源：佛教密宗本命佛体系，八大守护神对应十二生肖
// 依据：天干地支、十二因缘及五大元素相生理论
// 百度百科、佛教典籍综合整理

export interface GuardianBuddha {
  /** 佛菩萨名号 */
  name: string
  /** 核心寓意 */
  meaning: string
  /** 详细说明 */
  description: string
  /** 对应的动物索引（0=鼠 … 11=猪） */
  animalIndices: number[]
  /** 颜色主题 */
  color: string
  /** 种子字/象征符 */
  symbol: string
}

export const GUARDIAN_BUDDHAS: GuardianBuddha[] = [
  {
    name: '千手观音菩萨',
    meaning: '大慈悲 · 圆满 · 无量',
    description:
      '千手千眼观世音菩萨，以千手遍护众生、千眼遍观世间。使鼠年生人事事顺心，消灾除障，运势低落时得护持，旺盛时锦上添花。',
    animalIndices: [0],
    color: '#C62828',
    symbol: '卍',
  },
  {
    name: '虚空藏菩萨',
    meaning: '智慧 · 财富 · 诚实',
    description:
      '佛教八大菩萨之一，三世诸佛第一辅臣。以济度众生为乐，智慧功德如虚空般广阔。能使诚者财源广进，八方贵人相助，远离小人。',
    animalIndices: [1, 2],
    color: '#3D6B4B',
    symbol: '◇',
  },
  {
    name: '文殊菩萨',
    meaning: '大智慧 · 学业 · 事业',
    description:
      '佛教四大菩萨之一，代表无上智慧。右手持金刚宝剑斩断烦恼，左手持青莲花托般若经。助兔年生人学业精进、事业通达。',
    animalIndices: [3],
    color: '#7A5E12',
    symbol: '♢',
  },
  {
    name: '普贤菩萨',
    meaning: '礼德 · 大行愿 · 延寿',
    description:
      '佛教四大菩萨之一，以大行愿著称。骑六牙白象，象征愿行广大、功德圆满。使龙蛇年生人延命益寿，所求如愿。',
    animalIndices: [4, 5],
    color: '#5E5E5E',
    symbol: '⟠',
  },
  {
    name: '大势至菩萨',
    meaning: '智慧光 · 化血光',
    description:
      '西方三圣之一，以智慧光普照一切。使马年生人得智慧之光护佑，化解血光之灾，平安顺遂。',
    animalIndices: [6],
    color: '#C62828',
    symbol: '☸',
  },
  {
    name: '大日如来',
    meaning: '光明 · 理智 · 智慧',
    description:
      '佛教密宗最高本尊，遍照一切世间万物。如太阳般光明理智，开启无量智慧。使羊猴年生人心地光明、福慧双修。',
    animalIndices: [7, 8],
    color: '#7A5E12',
    symbol: '⊙',
  },
  {
    name: '不动尊菩萨',
    meaning: '理性 · 扫除障难',
    description:
      '五大明王之首，又称不动明王。现忿怒相降伏诸魔，内心慈悲济度众生。使鸡年生人扫除障难，把握机遇。',
    animalIndices: [9],
    color: '#2C5F7C',
    symbol: 'ⵔ',
  },
  {
    name: '阿弥陀佛',
    meaning: '光明无量 · 寿命无量',
    description:
      '西方极乐世界教主，以四十八大愿济度众生。光明无量照十方国，使狗猪年生人逢凶化吉，福寿绵长。',
    animalIndices: [10, 11],
    color: '#C62828',
    symbol: '☸',
  },
]

/** 根据生肖索引获取本命佛 */
export function getGuardianBuddha(animalIndex: number): GuardianBuddha | undefined {
  return GUARDIAN_BUDDHAS.find(b => b.animalIndices.includes(animalIndex))
}
