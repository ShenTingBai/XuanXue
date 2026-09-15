<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

/**
 * 保存确认弹层（页面 Ⅵ 段）。
 *
 * 依据交付规范 §7.4 与治理规范 §19.2：
 * - 先展示**本次保存摘要**（将保存的输入类别、结果内容、保存时间与规则版本、含敏感出生日期、
 *   如何查看与删除、不会更新本人档案），再由用户再次确认；不做隐式保存；
 * - 未登录时先由页面复用 AuthDialog 完成页内认证，认证成功本身不触发保存；
 * - 初始焦点进入、Escape 关闭、Tab 不进入背景、关闭后焦点返回触发按钮、移动端近全屏。
 */

const props = defineProps<{
  show: boolean
  /** 输入类别与原始表达（如「公历 2000-08-15」）。 */
  originalExpression: string
  /** 输入来源（手动填写 / 从本人档案带入）。 */
  originLabel: string
  /** 结果内容摘要（三柱一行，或候选两种整组）。 */
  resultLines: string[]
  /** 快照将记录的规则版本与来源集合版本。 */
  ruleVersion: string
  sourceSetVersion: string
  /** 引擎名与版本（实现工具）。 */
  engineLabel: string
  asOfDate: string
  busy: boolean
  /** 保存失败文案（含服务端复算不一致）。 */
  error?: string
  /** 服务端返回 created=false：同一次生成已保存过。 */
  alreadySaved?: boolean
  /** 已保存时间（created=false 时展示）。 */
  savedAt?: string
}>()

const emit = defineEmits<{ close: []; confirm: [] }>()

const panelRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

function rememberTrigger() {
  triggerRef.value =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
}

watch(
  () => props.show,
  open => {
    if (open) {
      rememberTrigger()
      nextTick(() => {
        titleRef.value?.focus()
      })
    } else {
      // 关闭后仅在确实记录了触发元素时返回焦点。
      nextTick(() => {
        triggerRef.value?.focus()
      })
    }
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return
  if (!panelRef.value) return
  const focusable = Array.from(
    panelRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(element => !element.hasAttribute('disabled'))
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (document.activeElement === titleRef.value) {
    event.preventDefault()
    if (event.shiftKey) last.focus()
    else first.focus()
    return
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="auth-dialog-wrap" role="presentation" @keydown="onKeydown">
      <div class="auth-dialog-backdrop" aria-hidden="true" @click="emit('close')" />
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bazi-save-title"
        class="auth-dialog-panel"
      >
        <h2 id="bazi-save-title" ref="titleRef" tabindex="-1" class="editorial-dialog-title">
          保存本次结果
        </h2>

        <p class="editorial-dialog-text">
          下面是将要保存的内容。保存会新建一条不可变的历史快照，不会自动更新，也不会改动你的本人档案。
        </p>

        <dl class="space-y-2 font-sans text-sm leading-relaxed" data-bazi-save-summary>
          <div>
            <dt class="text-ink-medium">输入类别</dt>
            <dd class="text-ink-dark">
              出生日期（{{ originLabel }}）：{{ originalExpression }}；不含出生时刻与出生地点。
            </dd>
          </div>
          <div>
            <dt class="text-ink-medium">结果内容</dt>
            <dd class="text-ink-dark">
              <span v-for="line in resultLines" :key="line" class="block">{{ line }}</span>
            </dd>
          </div>
          <div>
            <dt class="text-ink-medium">规则与来源版本</dt>
            <dd class="text-ink-dark">
              规则版本 {{ ruleVersion }}；来源集合 {{ sourceSetVersion }}；引擎 {{ engineLabel }}。
              查询当日 {{ asOfDate || '—' }}。
            </dd>
          </div>
          <div>
            <dt class="text-ink-medium">隐私提示</dt>
            <dd class="text-ink-dark">
              这条快照包含你的出生日期（敏感个人信息）。它只属于当前账号，其他账号无法读取。
            </dd>
          </div>
          <div>
            <dt class="text-ink-medium">保存时间</dt>
            <dd class="text-ink-dark">以服务器时间为准，保存后在「已保存的结果」里显示。</dd>
          </div>
          <div>
            <dt class="text-ink-medium">如何查看与删除</dt>
            <dd class="text-ink-dark">
              在下方「已保存的结果」中随时查看、删除单条，或按当前条数确认后清空全部八字历史；
              删除本人档案时可选择一并删除这些快照。
            </dd>
          </div>
          <div>
            <dt class="text-ink-medium">不会做什么</dt>
            <dd class="text-ink-dark">
              不会更新本人档案，不会自动保存以后的每次计算，也不会把结果导出或分享。
            </dd>
          </div>
        </dl>

        <p
          v-if="alreadySaved && savedAt"
          class="mt-4 font-sans text-sm text-ink-dark"
          role="status"
        >
          这次生成已经保存过（{{ savedAt }}）：重复保存不会产生第二条记录。
        </p>

        <p
          v-if="error"
          class="mt-4 font-sans text-sm text-cinnabar"
          role="alert"
          data-bazi-save-error
        >
          {{ error }}
        </p>

        <div class="editorial-dialog-actions mt-6">
          <button type="button" class="btn-quiet" :disabled="busy" @click="emit('close')">
            取消
          </button>
          <button type="button" class="btn-solid" :disabled="busy" @click="emit('confirm')">
            {{ busy ? '保存中...' : '确认保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
