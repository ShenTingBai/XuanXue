<script setup lang="ts">
import { computed } from 'vue'
import { BAZI_HISTORY_NAME_PREFIX, BAZI_RULE_VERSION, BAZI_TOOL_ID } from '~/constants/bazi-rules'
import type { ResultSnapshotRecord, ResultSnapshotSummary } from '~/types/bazi'
import { canReadHistory } from '~/constants/tool-catalog'

/**
 * 已保存的结果（页面 Ⅵ 段的历史入口）。
 *
 * 依据交付规范 §7.5 与治理规范 §19.2：
 * - 条目用普通列表中的按钮，**不误用** `listbox`；
 * - 列表只显示安全摘要（名称「八字基础排盘 · 保存时间」、完整性、来源、规则版本），
 *   **不显示精确出生日期**；
 * - 打开历史只读快照、不静默重算；快照规则版本与当前规则版本不同时明确提示；
 * - 提供「用当前规则重新计算」（生成未保存的新结果，原记录不变）与删除单条；
 * - 清空必须在显示条数后再次确认；
 * - 删除失败时列表项不移除，错误就地显示。
 */

const props = defineProps<{
  items: ResultSnapshotSummary[]
  loading: boolean
  error?: string
  selected: ResultSnapshotRecord | null
  selectedLoading: boolean
  selectedError?: string
  clearPending: boolean
  mutating: boolean
  mutateError?: string
  /** 历史功能是否可用（工具目录历史策略）。 */
  historyEnabled?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  open: [recordId: string]
  closeRecord: []
  remove: [recordId: string]
  recompute: [record: ResultSnapshotRecord]
  clearAll: []
  confirmClear: []
  cancelClear: []
}>()

const enabled = computed(() => props.historyEnabled ?? canReadHistory(BAZI_TOOL_ID))
const count = computed(() => props.items.length)

function qualifierText(qualifier: string | null): string {
  if (qualifier === 'candidate') return '跨节：年柱/月柱各有 2 种可能'
  if (qualifier === 'partial') return '三柱（缺时柱）'
  if (qualifier === 'unique') return '完整结果'
  return '结果'
}

function originText(origin: string): string {
  return origin === 'profile' ? '输入来自本人档案' : '输入为手动填写'
}

/** 保存时间（ISO）→ 分钟级展示；无法解析时原样返回。 */
function savedAtText(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function snapshotPillars(record: ResultSnapshotRecord): string[] {
  const result = record.resultSnapshot
  const lines: string[] = []
  if (result.uniquePillars) {
    lines.push(
      `年柱 ${result.uniquePillars.year.stem}${result.uniquePillars.year.branch}；月柱 ${result.uniquePillars.month.stem}${result.uniquePillars.month.branch}`,
    )
  }
  if (result.scenarios) {
    for (const scenario of result.scenarios) {
      lines.push(
        `年柱 ${scenario.yearPillar.stem}${scenario.yearPillar.branch}；月柱 ${scenario.monthPillar.stem}${scenario.monthPillar.branch}（${scenario.reason}）`,
      )
    }
  }
  lines.push(`日柱 ${result.dayPillar.stem}${result.dayPillar.branch}（日干 ${result.dayMaster}）`)
  return lines
}
</script>

<template>
  <section
    class="card-warm rounded-xl p-6 sm:p-8"
    data-bazi-history
    aria-labelledby="bazi-history-heading"
  >
    <h3 id="bazi-history-heading" class="font-display text-lg text-ink-dark">已保存的结果</h3>

    <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
      历史条目只显示保存时间与结果概况，不显示精确出生日期。打开条目查看的是当时保存的快照，
      不会按当前规则重算；需要按当前规则重算时请用「用当前规则重新计算」，它只生成本次未保存的新结果。
    </p>

    <div v-if="!enabled" class="mt-3 font-sans text-sm text-ink-medium" role="status">
      当前不支持查看结果历史。
    </div>

    <template v-else>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" class="btn-ghost" :disabled="loading" @click="emit('refresh')">
          {{ loading ? '读取中...' : items.length > 0 ? '刷新历史列表' : '查看已保存的结果' }}
        </button>
        <span v-if="items.length > 0" class="font-sans text-xs text-ink-medium">
          共 {{ count }} 条
        </span>
      </div>

      <p v-if="error" class="mt-3 font-sans text-sm text-cinnabar" role="alert">{{ error }}</p>

      <ul v-if="items.length > 0" class="mt-4 space-y-3" data-bazi-history-list>
        <li
          v-for="item in items"
          :key="item.recordId"
          class="rounded-lg border border-paper-dark p-4"
          :data-bazi-history-item="item.recordId"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-sans text-sm text-ink-dark">
                {{ item.displayNamePrefix || BAZI_HISTORY_NAME_PREFIX }} ·
                {{ savedAtText(item.savedAt) }}
              </p>
              <p class="mt-1 font-sans text-xs text-ink-medium leading-relaxed">
                {{ qualifierText(item.successQualifier) }}；{{ originText(item.inputOrigin) }}；
                规则版本 {{ item.ruleVersion }}；查询当日 {{ item.asOfDate }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-quiet"
                :disabled="selectedLoading || mutating"
                @click="emit('open', item.recordId)"
              >
                查看快照
              </button>
              <button
                type="button"
                class="btn-quiet"
                :disabled="mutating"
                @click="emit('remove', item.recordId)"
              >
                删除
              </button>
            </div>
          </div>
        </li>
      </ul>

      <p
        v-else-if="!loading"
        class="mt-4 font-sans text-sm text-ink-medium"
        data-bazi-history-empty
      >
        还没有保存过结果。生成结果后点击「保存本次结果」才会创建历史。
      </p>

      <div v-if="items.length > 0" class="mt-4">
        <button
          v-if="!clearPending"
          type="button"
          class="btn-quiet"
          :disabled="mutating"
          @click="emit('clearAll')"
        >
          清空全部八字历史
        </button>
        <div
          v-else
          class="editorial-dialog-confirm"
          role="alertdialog"
          aria-labelledby="bazi-clear-title"
        >
          <p id="bazi-clear-title" class="font-sans text-sm text-ink-dark">
            确认清空全部 {{ count }} 条八字历史记录？
          </p>
          <p class="mt-1 font-sans text-xs text-ink-medium">
            删除后无法恢复。若只想删掉其中一条，请在上面那条记录上点「删除」。
          </p>
          <div class="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              class="btn-quiet"
              :disabled="mutating"
              @click="emit('cancelClear')"
            >
              取消
            </button>
            <button
              type="button"
              class="btn-solid"
              :disabled="mutating"
              @click="emit('confirmClear')"
            >
              {{ mutating ? '清空中...' : `确认清空 ${count} 条` }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="mutateError" class="mt-3 font-sans text-sm text-cinnabar" role="alert">
        {{ mutateError }}
      </p>

      <p v-if="selectedLoading" class="mt-4 font-sans text-sm text-ink-medium" role="status">
        正在读取快照…
      </p>
      <p v-if="selectedError" class="mt-4 font-sans text-sm text-cinnabar" role="alert">
        {{ selectedError }}
      </p>

      <div
        v-if="selected"
        class="mt-4 rounded-lg border border-paper-dark p-4"
        data-bazi-history-snapshot
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <h4 class="font-sans text-sm text-ink-dark">快照详情（只读）</h4>
          <button type="button" class="btn-quiet" @click="emit('closeRecord')">关闭快照</button>
        </div>

        <p class="mt-2 font-sans text-xs text-ink-medium leading-relaxed">
          这是 {{ savedAtText(selected.savedAt) }} 保存的快照，按当时的规则版本
          {{ selected.ruleVersion }} 生成，不会随当前规则变化而改写。
        </p>
        <p
          v-if="selected.ruleVersion !== BAZI_RULE_VERSION"
          class="mt-2 font-sans text-xs text-ink-dark border-l-[3px] border-l-gold pl-3"
        >
          注意：这条快照使用的是旧规则版本（{{ selected.ruleVersion }}），与当前规则版本 （{{
            BAZI_RULE_VERSION
          }}）不同。若要用当前规则得到结果，请点「用当前规则重新计算」。
        </p>

        <ul class="mt-3 space-y-1 font-sans text-sm text-ink-dark">
          <li v-for="line in snapshotPillars(selected)" :key="line">{{ line }}</li>
        </ul>

        <dl class="mt-3 space-y-1 font-sans text-xs text-ink-medium leading-relaxed">
          <div>
            <dt class="inline">日期对照：</dt>
            <dd class="inline">
              {{ selected.resultSnapshot.dateComparison.originalExpression }} →
              {{ selected.resultSnapshot.dateComparison.normalizedSolar }}
            </dd>
          </div>
          <div>
            <dt class="inline">来源与版本：</dt>
            <dd class="inline">
              {{ originText(selected.inputOrigin) }}；规则版本 {{ selected.ruleVersion }}； 来源集合
              {{ selected.sourceSetVersion }}；引擎 {{ selected.engineName }}
              {{ selected.engineVersion }}
            </dd>
          </div>
        </dl>

        <div class="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            class="btn-quiet"
            :disabled="mutating"
            @click="emit('recompute', selected)"
          >
            用当前规则重新计算
          </button>
          <button
            type="button"
            class="btn-quiet"
            :disabled="mutating"
            @click="emit('remove', selected.recordId)"
          >
            删除这条记录
          </button>
        </div>
        <p class="mt-2 font-sans text-xs text-ink-light">
          「用当前规则重新计算」只把这条记录的输入复制成当次草稿并生成未保存的新结果，原记录不变。
        </p>
      </div>
    </template>
  </section>
</template>
