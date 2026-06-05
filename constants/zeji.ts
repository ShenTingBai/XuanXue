// 择吉日 — Event types and almanac reference data

/** Event categories users can choose from */
export const EVENT_TYPES: Record<string, { name: string; icon: string; keywords: string[] }> = {
  wedding:    { name: '嫁娶',  icon: '婚', keywords: ['嫁娶', '结婚', '婚嫁', '订婚', '纳采', '纳征', '嫁', '娶', '婚'] },
  opening:    { name: '开业',  icon: '业', keywords: ['开业', '开市', '开张', '交易', '立券', '纳财', '开市', '挂匾'] },
  moving:     { name: '搬家',  icon: '宅', keywords: ['搬家', '移徙', '入宅', '迁居', '移居', '入宅', '迁移'] },
  travel:     { name: '出行',  icon: '行', keywords: ['出行', '远行', '旅游', '出行', '远行'] },
  construction:{ name: '修造', icon: '造', keywords: ['修造', '动土', '装修', '开工', '修造', '动土', '破土', '安门', '起基', '上梁'] },
  burial:     { name: '安葬',  icon: '葬', keywords: ['安葬', '下葬', '入土', '安葬', '入殓', '移柩', '除服', '成服', '修坟', '立碑'] },
  sacrifice:  { name: '祭祀',  icon: '祀', keywords: ['祭祀', '祈福', '酬神', '祭祀', '斋醮', '祈福', '酬神', '求嗣', '沐佛', '设醮'] },
  meeting:    { name: '会友',  icon: '友', keywords: ['会友', '会友', '交友', '订盟'] },
  medical:    { name: '求医',  icon: '医', keywords: ['求医', '治病', '看病', '求医', '治病', '疗病', '针灸'] },
  study:      { name: '入学',  icon: '学', keywords: ['入学', '上学', '开学', '入学', '进学', '求学'] },
}

/** 十二值星 — 传统黄道/黑道分类
 *  口诀：建满平收黑，除危定执黄，成开皆可用，破闭不可当
 *  黄道（吉）：除、危、定、执、成、开
 *  黑道（凶）：建、满、平、收、破、闭
 */
export const TWELVE_STAR_LEVEL: Record<string, { level: '吉' | '凶' | '平'; desc: string }> = {
  '建': { level: '凶', desc: '建日，万物初萌，宜动不宜静' },
  '除': { level: '吉', desc: '除日，除旧布新，百事吉' },
  '满': { level: '凶', desc: '满日，物极必反，宜祭祀祈福' },
  '平': { level: '凶', desc: '平日，平顺无奇，诸事平常' },
  '定': { level: '吉', desc: '定日，定局有成，宜签约盟誓' },
  '执': { level: '吉', desc: '执日，执守不移，宜祈福结亲' },
  '破': { level: '凶', desc: '破日，冲破不吉，万事不宜' },
  '危': { level: '吉', desc: '危日，危中有机，宜经营求财' },
  '成': { level: '吉', desc: '成日，成事可期，百事皆宜' },
  '收': { level: '凶', desc: '收日，收敛收藏，宜纳财签约' },
  '开': { level: '吉', desc: '开日，开创开拓，百事大吉' },
  '闭': { level: '凶', desc: '闭日，闭藏不宜，万事皆凶' },
}

// Level color for twelve star display
export const TWELVE_STAR_COLOR: Record<string, string> = {
  '吉': '#3D6B4B',
  '凶': '#C62828',
  '平': '#7A5E12',
}
