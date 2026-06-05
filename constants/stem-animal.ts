// ── 六十甲子纳音性格详解 ──────────────────────────────────
//
// 数据来源：传统命理纳音断性格体系
// 纳音以两柱为一组共享同一五行属性与性格特征。
// 索引与 constants/bazi.ts 中的 NAYIN_TABLE 完全对齐。
//
// 在生肖页中用于"同年肖区分"——如甲子鼠 vs 丙子鼠，
// 虽同为鼠但纳音不同，性格有差异。

export interface NayinPersonality {
  /** 纳音名，如"海中金" */
  nayin: string
  /** 对应干支 */
  stemBranches: string[]
  /** 核心性格标签（3-5 字） */
  core: string
  /** 性格描述 */
  description: string
  /** 关键词（用于标签展示） */
  keywords: string[]
}

export const NAYIN_PERSONALITIES: NayinPersonality[] = [
  {
    nayin: '海中金',
    stemBranches: ['甲子', '乙丑'],
    core: '深邃难测',
    description:
      '外表平静，内心深沉。沉得住气，善于等待时机。内在才华出众但需外力激发。精明练达，处世圆融，社交能力强。',
    keywords: ['城府深', '沉得住气', '精明练达'],
  },
  {
    nayin: '炉中火',
    stemBranches: ['丙寅', '丁卯'],
    core: '热情积极',
    description:
      '热情奔放，积极向上。做事专注有威严，为人正直忠诚。前者气势旺盛宜远行，后者文雅恬淡喜清闲。',
    keywords: ['热情', '专注', '正直'],
  },
  {
    nayin: '大林木',
    stemBranches: ['戊辰', '己巳'],
    core: '仁义好善',
    description:
      '仁爱善良，重情重义。喜欢结交朋友，为人讲义气，有团队精神。能团结众人，有领导风范。',
    keywords: ['仁义', '好善', '重友情'],
  },
  {
    nayin: '路旁土',
    stemBranches: ['庚午', '辛未'],
    core: '随俗浮沉',
    description:
      '性格随环境变化，适应性较强。注重外在形象，喜欢追求时尚潮流。内心有不安定感，渴望认可。',
    keywords: ['适应力强', '随俗', '时尚'],
  },
  {
    nayin: '剑锋金',
    stemBranches: ['壬申', '癸酉'],
    core: '刚直果决',
    description:
      '性格刚强果断，直来直去。做事雷厉风行，有魄力。态度强硬时难免咄咄逼人，但内心坦荡。',
    keywords: ['刚直', '果断', '坦荡'],
  },
  {
    nayin: '山头火',
    stemBranches: ['甲戌', '乙亥'],
    core: '激情热烈',
    description:
      '平时沉寂内敛，一旦爆发则有燎原之势。具有爆发力和创造力，情感丰富浓烈，做事有冲劲。',
    keywords: ['激情', '爆发力', '创造力'],
  },
  {
    nayin: '涧下水',
    stemBranches: ['丙子', '丁丑'],
    core: '温文尔雅',
    description: '性格温和文雅，清新自然。做事中规中矩，有条不紊。稍显保守死板，但可靠可信。',
    keywords: ['温和', '文雅', '可靠'],
  },
  {
    nayin: '城头土',
    stemBranches: ['戊寅', '己卯'],
    core: '外刚内柔',
    description: '外表坚强刚硬，内心柔软敏感。心气较高，有自己的坚持。不善变通但可靠稳重。',
    keywords: ['刚强', '心高', '稳重'],
  },
  {
    nayin: '白蜡金',
    stemBranches: ['庚辰', '辛巳'],
    core: '精致讲究',
    description: '对生活品质有追求，讲究细节。有付出精神但有时显得计较。内心细腻，感受力强。',
    keywords: ['讲究', '细腻', '付出'],
  },
  {
    nayin: '杨柳木',
    stemBranches: ['壬午', '癸未'],
    core: '随和变通',
    description: '性格柔顺，善于变通。随环境调整自己，适应力强。不与人硬碰硬，以柔克刚。',
    keywords: ['随和', '善变通', '柔韧'],
  },
  {
    nayin: '泉中水',
    stemBranches: ['甲申', '乙酉'],
    core: '坦荡宽广',
    description: '心胸宽广，胸怀博大。为人坦荡真诚，善于交友。不计较小事，有容人之量。',
    keywords: ['心胸宽广', '坦荡', '真诚'],
  },
  {
    nayin: '屋上土',
    stemBranches: ['丙戌', '丁亥'],
    core: '诚实有远见',
    description: '诚实守信，有远见卓识。喜欢表现自己，志向高远。站在高处看问题，有大局观。',
    keywords: ['诚实', '远见', '守信'],
  },
  {
    nayin: '霹雳火',
    stemBranches: ['戊子', '己丑'],
    core: '雷厉风行',
    description: '脾气来得快去得也快，雷厉风行。做事有爆发力，干劲十足。性格直率不藏事。',
    keywords: ['雷厉风行', '直率', '爆发'],
  },
  {
    nayin: '松柏木',
    stemBranches: ['庚寅', '辛卯'],
    core: '平和仁厚',
    description: '心态平和，善良仁义。性格坚韧如松柏，经得起风雨。做人正直，有长者风范。',
    keywords: ['平和', '仁厚', '坚韧'],
  },
  {
    nayin: '长流水',
    stemBranches: ['壬辰', '癸巳'],
    core: '耐力持久',
    description: '做事有始有终，耐力出众。喜动不喜静，热爱探索。个性多变但不失方向感。',
    keywords: ['耐力', '持久', '好动'],
  },
  {
    nayin: '沙中金',
    stemBranches: ['甲午', '乙未'],
    core: '高贵独立',
    description: '气度高雅，有贵族气质。性格独立自主，不随波逐流。谨慎小心，鹤立鸡群。',
    keywords: ['高贵', '独立', '谨慎'],
  },
  {
    nayin: '山下火',
    stemBranches: ['丙申', '丁酉'],
    core: '积极善变',
    description: '热情积极但不够持久。脾气来得快去得也快。有上进心，喜欢尝试新鲜事物。',
    keywords: ['积极', '善变', '上进'],
  },
  {
    nayin: '平地木',
    stemBranches: ['戊戌', '己亥'],
    core: '谨慎稳重',
    description: '做事谨慎稳重，不惹是非。为人低调实在，一步一个脚印。居安思危意识可加强。',
    keywords: ['谨慎', '稳重', '实在'],
  },
  {
    nayin: '壁上土',
    stemBranches: ['庚子', '辛丑'],
    core: '独立随性',
    description: '个性独立，不喜合群。有自己的生活节奏和方式，不在意他人眼光。散漫中自有章法。',
    keywords: ['独立', '随性', '自由'],
  },
  {
    nayin: '金箔金',
    stemBranches: ['壬寅', '癸卯'],
    core: '纯真坦诚',
    description: '性格纯真坦诚，表里如一。把最真实的一面展现给世人。有时显得单纯，但心地纯净。',
    keywords: ['纯真', '坦诚', '表里如一'],
  },
  {
    nayin: '佛灯火',
    stemBranches: ['甲辰', '乙巳'],
    core: '聪慧明心',
    description: '心地聪慧，善解人意。有佛性慧根，看事通透。善良聪明，心如明镜。',
    keywords: ['聪慧', '善良', '通透'],
  },
  {
    nayin: '天河水',
    stemBranches: ['丙午', '丁未'],
    core: '心高志远',
    description: '志向高远，心气不凡。有理想抱负，不甘平庸。气质高贵中带有孤傲。',
    keywords: ['心高', '志远', '孤傲'],
  },
  {
    nayin: '大驿土',
    stemBranches: ['戊申', '己酉'],
    core: '胸怀博大',
    description: '心胸宽厚，有包容力。心态开放不固执。情感丰富，热情待人。',
    keywords: ['胸怀博', '包容', '热情'],
  },
  {
    nayin: '钗钏金',
    stemBranches: ['庚戌', '辛亥'],
    core: '高贵端庄',
    description: '气度高贵典雅，重视形象和尊严。希望被人尊重，有自尊心。孤芳自赏，追求品质。',
    keywords: ['高贵', '端庄', '重尊严'],
  },
  {
    nayin: '桑柘木',
    stemBranches: ['壬子', '癸丑'],
    core: '刚强不屈',
    description: '性格刚强好胜，威武不屈。生命力旺盛，坚韧不拔。认准的事会坚持到底，不轻易放弃。',
    keywords: ['刚强', '坚韧', '好胜'],
  },
  {
    nayin: '大溪水',
    stemBranches: ['甲寅', '乙卯'],
    core: '奔放包容',
    description: '性格奔放自由，积极向上。包容性强，大大咧咧不拘小节。有能量有能力，能成大事。',
    keywords: ['奔放', '包容', '积极'],
  },
  {
    nayin: '沙中土',
    stemBranches: ['丙辰', '丁巳'],
    core: '柔中带刚',
    description: '外表柔和，内心坚韧。能软能硬，善于变通。独立性强，不喜依赖他人。',
    keywords: ['柔中带刚', '独立', '变通'],
  },
  {
    nayin: '天上火',
    stemBranches: ['戊午', '己未'],
    core: '博爱公正',
    description: '如太阳般热情公正，喜欢帮助他人。性急而燥但心地善良。有领导才能和感召力。',
    keywords: ['博爱', '公正', '热情'],
  },
  {
    nayin: '石榴木',
    stemBranches: ['庚申', '辛酉'],
    core: '机敏多谋',
    description: '心机灵巧，善于谋划。做事积极主动，有进取心。思维敏捷，善于应对变化。',
    keywords: ['机敏', '多谋', '进取'],
  },
  {
    nayin: '大海水',
    stemBranches: ['壬戌', '癸亥'],
    core: '宽容深邃',
    description: '心胸宽广如海，包容万物。气场强大，情绪丰富。有深度有内涵，能成大事。',
    keywords: ['宽容', '深邃', '气场强'],
  },
]

/**
 * 根据干支字符串获取纳音性格
 * @param stemBranch 如"甲子"、"丙午"
 */
export function getNayinPersonality(stemBranch: string): NayinPersonality | undefined {
  return NAYIN_PERSONALITIES.find(p => p.stemBranches.includes(stemBranch))
}

/**
 * 根据天干和地支获取纳音性格
 * @param stem 天干，如"甲"
 * @param branch 地支，如"子"
 */
export function getNayinPersonalityByStemBranch(
  stem: string,
  branch: string,
): NayinPersonality | undefined {
  return getNayinPersonality(stem + branch)
}
