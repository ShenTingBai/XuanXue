/**
 * R5 结果历史数据库结构：通用结果快照表 result_snapshots（按 tool_id 维度，供后续工具复用）。
 *
 * 设计约束（依据数据规范 §11.2、交付规范 §7.5、治理规范 §11.4）：
 * - 快照**不可变**：只在保存时插入，之后不因档案修改、来源修订或规则升级而改写；
 * - 一个账号在同一工具下，同一 `result_id` 只能有一条（幂等标识，治理规范 §11.6）；
 * - 账号注销靠 accounts 外键级联删除，不额外维护清理逻辑；
 * - `result_id` 是"同一次生成的稳定标识"，`id` 是"已保存快照的行标识"，两者分列（D7 裁决）；
 * - 保留 `input_origin` 与 `rule_status`，用于将来区分来源与规则撤回状态（R5 一律 current）。
 *
 * 时间字段存 ISO 8601（UTC）；`created_at` 即保存时间，历史标题使用该时间。
 */

export const CREATE_RESULT_SNAPSHOTS_TABLE = `
CREATE TABLE IF NOT EXISTS result_snapshots (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  result_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK(schema_version >= 1),
  rule_version TEXT NOT NULL,
  engine_name TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  source_set_version TEXT NOT NULL,
  original_input_json TEXT NOT NULL,
  normalized_input_json TEXT NOT NULL,
  phase TEXT NOT NULL CHECK(phase IN ('success', 'failure')),
  success_qualifier TEXT,
  failure_category TEXT,
  failure_detail_code TEXT,
  result_snapshot_json TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  input_origin TEXT NOT NULL CHECK(input_origin IN ('manual', 'profile')),
  rule_status TEXT NOT NULL CHECK(rule_status IN ('current', 'superseded', 'withdrawn')),
  as_of_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(account_id, tool_id, result_id)
)
`

/**
 * 列表与计数共用同一个复合索引：等值条件为 (account_id, tool_id)，排序为 created_at DESC。
 * 不额外建 (account_id, tool_id) 单列索引——那是本索引的前缀，属冗余写入开销。
 */
export const INDEX_RESULT_SNAPSHOTS_ACCOUNT_TOOL = `CREATE INDEX IF NOT EXISTS idx_result_snapshots_account_tool ON result_snapshots(account_id, tool_id, created_at DESC)`
