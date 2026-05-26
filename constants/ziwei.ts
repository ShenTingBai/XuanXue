// constants/ziwei.ts

/** 十二宫基本特性 */
export const PALACE_INTERPRETATIONS: Record<string, string> = {
  '命宫': '代表一个人的先天禀赋、性格特质、人生走向。命宫中的星曜组合决定了个人的基本格局。',
  '兄弟宫': '代表兄弟姐妹关系、朋友往来、人际互动。也反映与平辈之间的缘分和助力。',
  '夫妻宫': '代表婚姻状况、配偶特征、感情生活的方式和质量。',
  '子女宫': '代表子女缘分、生育状况、与晚辈的关系，也反映个人的创造力和表现欲。',
  '财帛宫': '代表财运状况、理财能力、财富积累的方式和机会。',
  '疾厄宫': '代表身体健康状况、潜在疾病倾向、抵抗力和恢复能力。',
  '迁移宫': '代表外出运势、旅行运、人际关系网络，以及对环境变化的适应能力。',
  '交友宫': '代表社交圈、朋友质量、合作伙伴的缘分，以及在社会中的人际影响力。',
  '官禄宫': '代表事业发展、职业选择、工作态度和成就，也反映社会地位。',
  '田宅宫': '代表不动产状况、居住环境、家庭背景，也反映财富积累的稳定度。',
  '福德宫': '代表精神生活、福分深浅、内心世界和精神追求。',
  '父母宫': '代表父母关系、家庭背景、遗传特质，以及长辈缘分。',
}

/** 主星基本解读（单星入命宫时） */
export const STAR_INTERPRETATIONS: Record<string, string> = {
  '紫微': '紫微入命宫，帝王之星，性刚果断，领导力强，喜受人尊重。',
  '天机': '天机入命宫，智慧之星，思维敏捷，善谋略，变化多端。',
  '太阳': '太阳入命宫，光明之星，热情开朗，慷慨大方，贵气显赫。',
  '武曲': '武曲入命宫，财星之一，性格刚毅，执行力强，适合金融军警。',
  '天同': '天同入命宫，福星，性情温和，知足常乐，福禄双全。',
  '廉贞': '廉贞入命宫，次桃花星，聪明刚烈，重情义，有政治才能。',
  '天府': '天府入命宫，令星，稳重守成，有领导才能，福禄丰足。',
  '太阴': '太阴入命宫，温柔之星，细腻敏感，有艺术气质，主富。',
  '贪狼': '贪狼入命宫，桃花星，多才多艺，交际广泛，欲望强烈。',
  '巨门': '巨门入命宫，暗星之一，口才佳，善辩论，是非较多。',
  '天相': '天相入命宫，印星，公正善良，乐于助人，有协调能力。',
  '天梁': '天梁入命宫，荫星，有长者风范，慈悲为怀，有贵人运。',
  '七杀': '七杀入命宫，将星，性格刚烈，敢拼敢闯，有开创精神。',
  '破军': '破军入命宫，耗星，勇于变革，突破常规，先破后立。',
}

/** 四化解读 */
export const TRANSFORMATION_INTERPRETATIONS: Record<string, Record<string, string>> = {
  '禄': {
    '紫微': '禄存紫微，帝王得禄，权威更盛，财运亨通。',
    '天机': '天机化禄，智慧增财，善用智谋生财。',
  },
  '权': {
    '紫微': '紫微化权，帝王掌权，领导权威更加巩固。',
    '天机': '天机化权，智慧为权，善于策划掌控全局。',
  },
  '科': {},
  '忌': {},
}

/** 地支在 4×4 网格中的 grid-row/grid-col 位置
 *  4 列布局：巳午未申（行1），辰+空+酉（行2），卯+空+戌（行3），寅丑子亥（行4） */
export const BRANCH_GRID_POSITIONS: Record<string, { row: number; col: number }> = {
  '巳': { row: 1, col: 1 },
  '午': { row: 1, col: 2 },
  '未': { row: 1, col: 3 },
  '申': { row: 1, col: 4 },
  '辰': { row: 2, col: 1 },
  '酉': { row: 2, col: 4 },
  '卯': { row: 3, col: 1 },
  '戌': { row: 3, col: 4 },
  '寅': { row: 4, col: 1 },
  '丑': { row: 4, col: 2 },
  '子': { row: 4, col: 3 },
  '亥': { row: 4, col: 4 },
}

/** 地支顺序索引 */
export const BRANCH_INDEX: Record<string, number> = {
  '子': 0, '丑': 1, '寅': 2, '卯': 3, '辰': 4, '巳': 5,
  '午': 6, '未': 7, '申': 8, '酉': 9, '戌': 10, '亥': 11,
}

/** 地支→角度映射（天星图使用），寅=0° 为紫微斗数标准 */
export const BRANCH_TO_ANGLE: Record<string, number> = {
  '寅': 0, '卯': 30, '辰': 60, '巳': 90,
  '午': 120, '未': 150, '申': 180, '酉': 210,
  '戌': 240, '亥': 270, '子': 300, '丑': 330,
}

/** 时辰名称（用于输入选择）。index 0-11 对应早子-亥，index 12=晚子。
 *  注意: iztro timeIndex 0=早子时, 12=晚子时 */
export const TIME_NAMES = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '晚子时']

/** 时辰（下拉选择）→ iztro timeIndex 映射
 *  下拉 index 0(子时) → iztro timeIndex 0(早子)
 *  下拉 index 1(丑时) → iztro timeIndex 1(丑)
 *  ...
 *  下拉 index 11(亥时) → iztro timeIndex 11(亥)
 *  无晚子时选项（晚子时仅通过 profile 的 birth_hour=23 自动推导，timeIndex=12）
 *
 *  出生小时(0-23) → iztro timeIndex 映射：
 *  早子=0, 丑=1, 寅=2 ... 亥=11, 晚子=12 */
export function getTimeIndex(hour: number): number {
  return Math.floor((hour + 1) / 2)
}

/** iztro timeIndex → 时辰名称（用于显示） */
export function getTimeName(timeIndex: number): string {
  return TIME_NAMES[timeIndex] ?? `${timeIndex}时`
}

/** 性别选项 */
export const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
] as const

/** 获取宫位解读文本 */
export function getPalaceInterpretation(palaceName: string): string {
  return PALACE_INTERPRETATIONS[palaceName] ?? ''
}

/** 获取星曜解读文本 */
export function getStarInterpretation(starName: string): string {
  return STAR_INTERPRETATIONS[starName] ?? ''
}
