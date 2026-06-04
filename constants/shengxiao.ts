/** 生肖配对解释文本 */
export const SHENGXIAO_PAIRING_EXPLANATIONS: Record<string, string> = {
  '三合': '三合贵人，互为生旺，性格互补，合作无间，是最佳搭档。',
  '六合': '六合贵人，天作之合，彼此吸引，相处和谐，姻缘上佳。',
  '相冲': '六冲对冲，性格对立，观念分歧较大，相处需互相包容忍让。',
  '相害': '六害相侵，互相消耗，易生误会摩擦，需多沟通理解。',
  '中吉': '五行平和，无大冲大合，可和谐相处，日久生情。',
}

export function getShengXiaoExplanation(relation: string): string {
  return SHENGXIAO_PAIRING_EXPLANATIONS[relation] ?? ''
}
