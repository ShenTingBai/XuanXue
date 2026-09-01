import { describe, expect, it } from 'vitest'
import {
  filterListedToolRecords,
  getHiddenToolFromQuery,
  TOOL_CATALOG,
  getToolById,
  getToolByRoute,
  shouldListTool,
} from '~/constants/tool-catalog'

describe('tool catalog', () => {
  it('keeps all existing tool ids and routes unique', () => {
    expect(TOOL_CATALOG).toHaveLength(11)
    expect(new Set(TOOL_CATALOG.map(tool => tool.id)).size).toBe(11)
    expect(new Set(TOOL_CATALOG.map(tool => tool.route)).size).toBe(11)
  })

  it('marks the three containment targets as hidden and the other tools as listed', () => {
    for (const toolId of ['ziwei', 'hehun', 'meihua']) {
      expect(getToolById(toolId)?.exposure).toBe('hidden')
    }

    for (const toolId of [
      'shengxiao',
      'constellation',
      'zeji',
      'bazi',
      'name-test',
      'cezi',
      'guming',
      'yijing',
    ]) {
      expect(getToolById(toolId)?.exposure).toBe('listed')
    }
  })

  it('returns no catalog entry for unknown ids and routes', () => {
    expect(getToolById('unknown')).toBeUndefined()
    expect(getToolByRoute('/tools/unknown')).toBeUndefined()
  })

  it('only exposes listed tools to entry points', () => {
    expect(shouldListTool('ziwei')).toBe(false)
    expect(shouldListTool('hehun')).toBe(false)
    expect(shouldListTool('meihua')).toBe(false)
    expect(shouldListTool('shengxiao')).toBe(true)
    expect(shouldListTool('unknown')).toBe(false)
  })

  it('过滤最近使用记录时仅保留可见工具并保持原始顺序', () => {
    const records = [
      { id: 1, type: 'ziwei' },
      { id: 2, type: 'shengxiao' },
      { id: 3, type: 'unknown' },
      { id: 4, type: 'hehun' },
      { id: 5, type: 'yijing' },
    ]

    expect(filterListedToolRecords(records)).toEqual([
      { id: 2, type: 'shengxiao' },
      { id: 5, type: 'yijing' },
    ])
  })

  it('状态页参数只接受单个隐藏工具 id', () => {
    expect(getHiddenToolFromQuery('ziwei')?.id).toBe('ziwei')
    expect(getHiddenToolFromQuery('shengxiao')).toBeUndefined()
    expect(getHiddenToolFromQuery('unknown')).toBeUndefined()
    expect(getHiddenToolFromQuery(['ziwei'])).toBeUndefined()
    expect(getHiddenToolFromQuery(undefined)).toBeUndefined()
  })

  it('目录路由始终能回查到同一工具 id', () => {
    for (const tool of TOOL_CATALOG) {
      expect(getToolByRoute(tool.route)?.id).toBe(tool.id)
    }
  })
})
