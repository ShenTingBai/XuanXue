export const DIVINATION_TYPES = ['shengxiao', 'constellation', 'bazi', 'yijing', 'ziwei'] as const
export type DivinationType = typeof DIVINATION_TYPES[number]

export interface DivinationCreateResponse {
  id: number
  created_at: string
}

export interface DivinationListItem {
  id: number
  type: string
  input_data: unknown
  created_at: string
}

export interface DivinationDetailResponse extends DivinationListItem {
  result_data: unknown
}
