// ── 六十甲子太岁星君表 ──────────────────────────────────────
//
// 数据来源：道教传统六十甲子神体系 + 维基文献
// 六十位值年太岁按干支循环轮值，每六十年一周期。
// 每个人出生年份对应一位"本命太岁"（本命守护神）。
//
// 2026年（丙午）值年太岁：文哲大将军

export interface TaiSuiDeity {
  /** 干支名，如"丙午" */
  stemBranch: string
  /** 星君名，如"文哲" */
  name: string
  /** 星君全称，如"文哲大将军" */
  title: string
  /** 星君简介（历史人物事迹） */
  description: string
}

export type TaiSuiRelation =
  | '值太岁'
  | '冲太岁'
  | '刑太岁'
  | '害太岁'
  | '破太岁'
  | '三合'
  | '六合'
  | '平'

export interface MitigationGuide {
  /** 关系类型 */
  relation: TaiSuiRelation | '综合'
  /** 严重程度 */
  severity: '最重' | '较重' | '中等' | '较轻'
  /** 影响描述 */
  effect: string
  /** 化解方法（编号列表，对应 MITIGATION_METHODS） */
  methodIndices: number[]
  /** 专属禁忌 */
  taboos: string[]
  /** 专属建议 */
  tips: string[]
}

// ── 六十甲子太岁星君 ──
export const TAI_SUI_DEITIES: TaiSuiDeity[] = [
  {
    stemBranch: '甲子',
    name: '金辨',
    title: '金辨大将军',
    description: '明代将军，性忠勇，爱民如子，百姓立庙祀之。',
  },
  {
    stemBranch: '乙丑',
    name: '陈材',
    title: '陈材大将军',
    description: '唐代将领，体魄魁梧，骁勇善战，镇守边疆有功。',
  },
  {
    stemBranch: '丙寅',
    name: '耿章',
    title: '耿章大将军',
    description: '明代官员，以孝闻名，曾任兵部侍郎，为官清正。',
  },
  {
    stemBranch: '丁卯',
    name: '沈兴',
    title: '沈兴大将军',
    description: '明代将领，智勇双全，屡立战功，封征南将军。',
  },
  {
    stemBranch: '戊辰',
    name: '赵达',
    title: '赵达大将军',
    description: '三国吴术士，精通天文术数，能以算法推演吉凶。',
  },
  {
    stemBranch: '己巳',
    name: '郭灿',
    title: '郭灿大将军',
    description: '宋代将领，慷慨好施，赈济贫民，深得百姓爱戴。',
  },
  {
    stemBranch: '庚午',
    name: '王济',
    title: '王济大将军',
    description: '宋代名医，精于医术，常免费为贫民治病。',
  },
  {
    stemBranch: '辛未',
    name: '李素',
    title: '李素大将军',
    description: '唐代官员，任河南尹时秉公执法，人皆敬服。',
  },
  {
    stemBranch: '壬申',
    name: '刘旺',
    title: '刘旺大将军',
    description: '汉代将领，英勇善战，平定边疆，封忠武侯。',
  },
  {
    stemBranch: '癸酉',
    name: '康志',
    title: '康志大将军',
    description: '唐代将领，精通兵法，治军严明，功勋卓著。',
  },
  {
    stemBranch: '甲戌',
    name: '施广',
    title: '施广大将军',
    description: '宋代官员，为官清廉，兴修水利，造福一方百姓。',
  },
  {
    stemBranch: '乙亥',
    name: '任保',
    title: '任保大将军',
    description: '明代将领，体恤士卒，战功赫赫，封镇远侯。',
  },
  {
    stemBranch: '丙子',
    name: '郭嘉',
    title: '郭嘉大将军',
    description: '东汉末年曹操帐下著名谋士，才策谋略，世之奇士。',
  },
  {
    stemBranch: '丁丑',
    name: '汪文',
    title: '汪文大将军',
    description: '宋代官员，字质甫，为官勤政爱民，深得百姓称颂。',
  },
  {
    stemBranch: '戊寅',
    name: '鲁先',
    title: '鲁先大将军',
    description: '明代将领，世袭指挥使，平盗有功，升参将。',
  },
  {
    stemBranch: '己卯',
    name: '龙仲',
    title: '龙仲大将军',
    description: '宋代官员，任南康知军时廉明自持，创建学宫。',
  },
  {
    stemBranch: '庚辰',
    name: '董德',
    title: '董德大将军',
    description: '元代官员，性至孝，为官宽严相济，深受百姓爱戴。',
  },
  {
    stemBranch: '辛巳',
    name: '郑但',
    title: '郑但大将军',
    description: '唐代诗人，工诗善文，曾任刺史，以文学著称。',
  },
  {
    stemBranch: '壬午',
    name: '陆明',
    title: '陆明大将军',
    description: '唐代官员，宽厚仁慈，断案公正，民称"陆青天"。',
  },
  {
    stemBranch: '癸未',
    name: '魏仁',
    title: '魏仁大将军',
    description: '汉代将领，忠勇报国，战功彪炳，封忠烈侯。',
  },
  {
    stemBranch: '甲申',
    name: '方杰',
    title: '方杰大将军',
    description: '唐代官员，政绩卓著，尤擅治理水患，保一方平安。',
  },
  {
    stemBranch: '乙酉',
    name: '蒋崇',
    title: '蒋崇大将军',
    description: '汉代官员，廉洁奉公，德政昭彰，百姓敬仰。',
  },
  {
    stemBranch: '丙戌',
    name: '白敏',
    title: '白敏大将军',
    description: '唐代诗人白居易之弟，为官清正，善理政事。',
  },
  {
    stemBranch: '丁亥',
    name: '封济',
    title: '封济大将军',
    description: '唐代官员，字素如，为官清廉，制军有法。',
  },
  {
    stemBranch: '戊子',
    name: '邹铛',
    title: '邹铛大将军',
    description: '宋代官员，任参知政事时广开言路，体恤民情。',
  },
  {
    stemBranch: '己丑',
    name: '傅佑',
    title: '傅佑大将军',
    description: '宋代官员，一字佑之，为官公正廉明，爱民如子。',
  },
  {
    stemBranch: '庚寅',
    name: '邬桓',
    title: '邬桓大将军',
    description: '元代将领，英勇善战，以忠义闻名于时，深得士心。',
  },
  {
    stemBranch: '辛卯',
    name: '范宁',
    title: '范宁大将军',
    description: '东晋经学家，治学严谨，撰《春秋榖梁传集解》。',
  },
  {
    stemBranch: '壬辰',
    name: '彭泰',
    title: '彭泰大将军',
    description: '明代官员，性刚正不阿，嫉恶如仇，民颂其德。',
  },
  {
    stemBranch: '癸巳',
    name: '徐单',
    title: '徐单大将军',
    description: '唐代官员，任刑部侍郎时明察秋毫，匡扶正义。',
  },
  {
    stemBranch: '甲午',
    name: '章词',
    title: '章词大将军',
    description: '唐代官员，为官忠厚，不慕荣利，辞官归隐。',
  },
  {
    stemBranch: '乙未',
    name: '杨仙',
    title: '杨仙大将军',
    description: '唐代道士，精通玄学，济世度人，世称杨真人。',
  },
  {
    stemBranch: '丙申',
    name: '管仲',
    title: '管仲大将军',
    description: '春秋时期齐国名相，辅佐齐桓公成就霸业，一代贤相。',
  },
  {
    stemBranch: '丁酉',
    name: '唐杰',
    title: '唐杰大将军',
    description: '唐代将领，字子文，善骑射，屡立战功。',
  },
  {
    stemBranch: '戊戌',
    name: '姜武',
    title: '姜武大将军',
    description: '宋代官员，为官忠厚正直，执法严明而不失仁心。',
  },
  {
    stemBranch: '己亥',
    name: '谢太',
    title: '谢太大将军',
    description: '明代官员，性仁厚，为官廉明，深得民心。',
  },
  {
    stemBranch: '庚子',
    name: '卢秘',
    title: '卢秘大将军',
    description: '唐代官员，姓卢名秘，为官清正，百姓有颂。',
  },
  {
    stemBranch: '辛丑',
    name: '杨信',
    title: '杨信大将军',
    description: '宋代官员，任知府时劝课农桑，兴修水利，政绩斐然。',
  },
  {
    stemBranch: '壬寅',
    name: '贺谔',
    title: '贺谔大将军',
    description: '元代将领，有勇略，善治军，讨贼有功。',
  },
  {
    stemBranch: '癸卯',
    name: '皮时',
    title: '皮时大将军',
    description: '唐代官员，通晓经史，任刺史时以德化民。',
  },
  {
    stemBranch: '甲辰',
    name: '李诚',
    title: '李诚大将军',
    description: '元代官员，字克诚，渭南人。任三原知县时劝农兴学，除奸防盗，恩威并施，百姓安居。',
  },
  {
    stemBranch: '乙巳',
    name: '吴遂',
    title: '吴遂大将军',
    description:
      '宋代官员，字至道，安徽人。嘉熙四年任休宁知县，善断疑狱。大旱时祈雨三日得大雨，赈济灾民四万八千人。',
  },
  {
    stemBranch: '丙午',
    name: '文哲',
    title: '文哲大将军',
    description:
      '明代名臣，名王缜字文哲，东莞人。弘治六年进士，出使安南不受馈金。历任兵科给事中、山西参政、福建左布政使，官至南京户部尚书，赈济饥民，多有善政。',
  },
  {
    stemBranch: '丁未',
    name: '缪丙',
    title: '缪丙大将军',
    description: '宋代官员，性仁厚，隐于民间，乐于助人。',
  },
  {
    stemBranch: '戊申',
    name: '徐浩',
    title: '徐浩大将军',
    description: '唐代书法家，工草隶，曾任吏部侍郎，封会稽郡公。',
  },
  {
    stemBranch: '己酉',
    name: '程宝',
    title: '程宝大将军',
    description: '唐代将领，忠勇报国，战死沙场，追赠忠义侯。',
  },
  {
    stemBranch: '庚戌',
    name: '倪秘',
    title: '倪秘大将军',
    description: '宋代官员，以文章闻名，曾任翰林学士，修国史。',
  },
  {
    stemBranch: '辛亥',
    name: '叶坚',
    title: '叶坚大将军',
    description: '明代将领，骁勇善战，为人正直，屡立战功。',
  },
  {
    stemBranch: '壬子',
    name: '丘德',
    title: '丘德大将军',
    description: '宋代将领，忠勇报国，治军有方，士卒爱戴。',
  },
  {
    stemBranch: '癸丑',
    name: '朱得',
    title: '朱得大将军',
    description: '明代将领，勇猛善战，封武安侯，开拓边疆有功。',
  },
  {
    stemBranch: '甲寅',
    name: '张朝',
    title: '张朝大将军',
    description: '唐代官员，任刺史时政简刑清，深受百姓爱戴。',
  },
  {
    stemBranch: '乙卯',
    name: '万清',
    title: '万清大将军',
    description: '元代官员，精于吏治，任知府时兴利除弊，政声卓著。',
  },
  {
    stemBranch: '丙辰',
    name: '辛亚',
    title: '辛亚大将军',
    description: '唐代将领，英勇过人，镇守边疆有功，封镇边侯。',
  },
  {
    stemBranch: '丁巳',
    name: '杨彦',
    title: '杨彦大将军',
    description: '宋代官员，任知府时廉洁自守，断案公正，有"杨青天"之誉。',
  },
  {
    stemBranch: '戊午',
    name: '黎卿',
    title: '黎卿大将军',
    description: '唐代官员，工诗善文，曾任刺史，政绩卓著。',
  },
  {
    stemBranch: '己未',
    name: '傅党',
    title: '傅党大将军',
    description: '宋代官员，任知府时爱民如子，深得人心。',
  },
  {
    stemBranch: '庚申',
    name: '毛梓',
    title: '毛梓大将军',
    description: '元代将领，性刚直，善治军，讨平叛乱有功。',
  },
  {
    stemBranch: '辛酉',
    name: '石政',
    title: '石政大将军',
    description: '唐代将领，勇力过人，善骑射，封忠武将军。',
  },
  {
    stemBranch: '壬戌',
    name: '洪充',
    title: '洪充大将军',
    description: '明代官员，任御史时直言敢谏，不畏权贵。',
  },
  {
    stemBranch: '癸亥',
    name: '虞程',
    title: '虞程大将军',
    description: '汉代官员，以孝廉举，任太守时清正廉明，政绩显著。',
  },
]

// ── 快速查找 ──

/** 根据出生年份获取本命太岁 */
export function getBirthTaiSui(year: number): TaiSuiDeity {
  const idx = getSexagenaryIndex(year)
  return TAI_SUI_DEITIES[idx]
}

/** 根据年份获取值年太岁 */
export function getYearTaiSui(year: number): TaiSuiDeity {
  return getBirthTaiSui(year)
}

/** 干支索引（0-59） */
function getSexagenaryIndex(year: number): number {
  const stem = (((year - 4) % 10) + 10) % 10
  const branch = (((year - 4) % 12) + 12) % 12
  // 干支索引 = 天干索引 + 10 * 偏移（需要同奇偶）
  if ((stem - branch) % 2 !== 0) {
    // 理论上不会出现，但安全处理
    return branch
  }
  const diff = stem - branch
  const k = (((diff / 2) % 6) + 6) % 6
  return (((stem + 10 * k) % 60) + 60) % 60
}

// ── 化解建议 ──────────────────────────────────────────────

/**
 * 七大化解方法（在线搜索结果整理）
 * 来源：道教宫观资料、民俗命理网站
 */

export const MITIGATION_METHODS = [
  {
    id: 1,
    title: '安太岁',
    summary: '在家中或庙宇安奉太岁符，每月初一、十五祭拜',
    details:
      '填写太岁符后，安放于厅堂清净高处。立春后选吉日，以清茶、四果、汤圆供奉。每月初一、十五及太岁诞辰（农历七月十九）祭拜。年末（腊月廿四）谢太岁焚符。',
  },
  {
    id: 2,
    title: '摄太岁',
    summary: '到庙宇道观拜太岁，祈求平安',
    details:
      '立春后至正月十五为黄金期。购买太岁衣包，写上姓名和生辰，先拜斗姆元君，再向值年太岁参拜，逐一向六十甲子太岁上香，最后化宝。年末务必还神。',
  },
  {
    id: 3,
    title: '合太岁',
    summary: '佩戴三合/六合生肖饰品，化解冲犯',
    details:
      '利用生肖三合六合原理，佩戴与太岁相合的生肖饰物。三合局如申子辰、亥卯未、寅午戌、巳酉丑。六合如子丑、寅亥、卯戌、辰酉、巳申、午未。',
  },
  {
    id: 4,
    title: '躲太岁（躲春）',
    summary: '立春交节前后各一小时静处避太岁',
    details:
      '立春交节时刻前后各1小时，在静室中拉上窗帘，避免见光。不与外界接触，保持心态平和，躲避太岁交接时的气场冲击。',
  },
  {
    id: 5,
    title: '佩戴吉祥物',
    summary: '太岁符、五帝钱、红绳等护身',
    details:
      '佩戴开光太岁符、五帝钱（红绳串起）、黑曜石或红玛瑙手串。穿红色内衣、系红腰带，红色象征吉祥辟邪，可激发低迷气场。',
  },
  {
    id: 6,
    title: '风水调理',
    summary: '太岁方位忌动土，岁破方位宜静不宜动',
    details:
      '当年太岁所在方位忌动土、装修、敲打。岁破方位放置铜葫芦或五帝钱化煞。保持家居整洁，气流通畅。避免杂物堆积。',
  },
  {
    id: 7,
    title: '行善积德',
    summary: '主动应变化，以善行冲喜化吉',
    details:
      '一喜挡三灾：主动求变（搬家、旅游）、行善积德（捐款、放生、做义工）。可主动捐血化解血光。避免重大投资、冒险决策、做担保人。',
  },
]

// ── 按关系类型推荐化解方案 ──

export const MITIGATION_GUIDES: Record<TaiSuiRelation, MitigationGuide> = {
  值太岁: {
    relation: '值太岁',
    severity: '较重',
    effect: '本命年值太岁，所谓"太岁当头坐，无喜必有祸"。运势波动较大，情绪不稳，宜守不宜攻。',
    methodIndices: [0, 1, 4, 5, 6], // 安太岁、摄太岁、吉祥物、风水、行善
    taboos: ['忌冲动决策', '忌重大投资', '忌远行冒险'],
    tips: ['多穿红色衣物', '凡事三思后行', '宜静不宜动', '可主动办喜事以冲喜'],
  },
  冲太岁: {
    relation: '冲太岁',
    severity: '最重',
    effect: '与太岁相冲，易生大变——迁居、换职、关系动荡。冲击力最强，需格外谨慎。',
    methodIndices: [0, 1, 2, 3, 4],
    taboos: ['忌与太岁生肖之人激烈争执', '忌冲动迁居换职', '忌高风险投资'],
    tips: ['谨言慎行，方可平稳过渡', '佩戴六合生肖饰品化解', '主动求变以应冲象'],
  },
  刑太岁: {
    relation: '刑太岁',
    severity: '中等',
    effect: '与太岁相刑，防口舌是非、合同纠纷、人际紧张。',
    methodIndices: [0, 1, 4, 7],
    taboos: ['忌口舌之争', '忌轻率签约担保', '忌与人生意气之争'],
    tips: ['待人宜宽、处事宜稳', '重要文件仔细核对', '莫争一时之气'],
  },
  害太岁: {
    relation: '害太岁',
    severity: '较轻',
    effect: '与太岁相害，防小人暗算、误会中伤、人际关系受损。',
    methodIndices: [0, 4, 7],
    taboos: ['忌轻信他人', '忌背后议论', '忌与人合伙投资'],
    tips: ['重要事务亲自确认', '勿轻信他人承诺', '保持低调，避免招摇'],
  },
  破太岁: {
    relation: '破太岁',
    severity: '较轻',
    effect: '与太岁相破，有小破财、计划受阻之象。影响较轻，细心谨慎即可化解。',
    methodIndices: [0, 4, 7],
    taboos: ['忌奢侈消费', '忌冒险投资', '忌粗心大意'],
    tips: ['细心谨慎即可化解', '注意保管财物', '加强时间管理'],
  },
  三合: {
    relation: '三合',
    severity: '较轻',
    effect: '与太岁三合，贵人运旺，诸事顺遂。宜积极拓展、把握机遇。',
    methodIndices: [],
    taboos: [],
    tips: ['此年运势不错，宜积极拓展', '把握机遇，可望有大成', '贵人运旺，多与人交往'],
  },
  六合: {
    relation: '六合',
    severity: '较轻',
    effect: '与太岁六合，人缘佳、合作顺。易得贵人提携，利人际与感情。',
    methodIndices: [],
    taboos: [],
    tips: ['人缘佳，宜拓展社交', '合作顺遂，利事业感情', '把握机会，百事亨通'],
  },
  平: {
    relation: '平',
    severity: '较轻',
    effect: '与太岁关系平和，无大起大落。按部就班，静水流深，亦是福气。',
    methodIndices: [],
    taboos: [],
    tips: ['保持平常心', '稳扎稳打', '静水流深，亦是福分'],
  },
}

// ── 通用化解口诀 ──
export const MITIGATION_MANTRA =
  '一拜太岁安家宅，二戴符印护身脉，三行善事积阴德，四避凶方守静泰，五用三合引贵助，六修心性顺天律。'
