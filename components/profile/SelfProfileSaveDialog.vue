<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { SelfProfile, NormalizedBirthDate, RawBirthDate } from '~/types/self-profile'
import { diffBirthDate, describeBirthDate } from '~/utils/self-profile/birth-date'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'

/**
 * 本人档案保存差异确认对话框（R4 收敛 v3）。
 *
 * 复用项目已有对话框结构与焦点行为（AuthDialog/账号页删除弹层）：
 * - 受控 show/currentProfile/candidate/busy/error/conflict/readiness；
 * - readiness=false（读取失败/过期/会话失效）时不可生成可确认差异：禁用确认并提供 reload；
 * - 展示新增/修改/保持的完整日期组、原历法表达及规范化公历；
 * - 必须明确属于本人且单独确认长期保存告知，checkbox 默认未选；
 * - confirm 事件携带冻结载荷：expected、accountId、raw 候选的复制、consent 版本；
 *   载荷在打开时冻结，handleConfirm 不读可变 props.candidate.raw；
 * - 账号 id、profile id/version、候选及授权状态变化使旧同意失效（不只比较 version）；
 *   仅显式成功重读后展示新差异并重新勾选；首次无档案也绑定真实账号 id。
 */

const props = defineProps<{
  show: boolean
  /** 当前已保存档案（无档案为 null）。 */
  currentProfile: SelfProfile | null
  /** 本次拟保存的规范化出生日期（已通过服务端重校验前的本地规范化）。 */
  candidate: NormalizedBirthDate | null
  /** 明确读取成功标记：false=读取失败/过期/会话失效，禁止生成可确认差异。 */
  readiness: boolean
  /** 当前账号 id（首次无档案也绑定真实账号）。 */
  accountId: number | null
  busy: boolean
  error: string | null
  conflict: boolean
}>()

/** confirm 冻结载荷：父页面只能用此载荷写请求，不能重新读可变 profile。 */
export interface SaveConfirmPayload {
  expected: { profileId: string; version: number } | null
  accountId: number | null
  birthDate: RawBirthDate
  consentPolicyVersion: string
}

const emit = defineEmits<{
  close: []
  confirm: [payload: SaveConfirmPayload]
  reload: []
}>()

const consentChecked = ref(false)
const dialogRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

// 打开时冻结 expected、账号与 raw 候选的复制；变化时旧确认失效。
const frozenExpected = ref<{ profileId: string; version: number } | null>(null)
const frozenAccountId = ref<number | null>(null)
const frozenBirthDate = ref<RawBirthDate | null>(null)

function rememberTrigger() {
  triggerRef.value =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
}

function freezeSnapshot() {
  // 首次无档案：expected=null 但账号仍绑定真实 accountId。
  if (props.currentProfile) {
    frozenExpected.value = {
      profileId: props.currentProfile.id,
      version: props.currentProfile.version,
    }
    frozenAccountId.value = props.currentProfile.accountId
  } else {
    frozenExpected.value = null
    frozenAccountId.value = props.accountId
  }
  // raw 候选深复制冻结：后续 candidate 对象变化不改变已冻结载荷。
  frozenBirthDate.value = props.candidate ? { ...props.candidate.raw } : null
}

watch(
  () => props.show,
  open => {
    if (open) {
      consentChecked.value = false
      rememberTrigger()
      freezeSnapshot()
      nextTick(() => {
        titleRef.value?.focus()
      })
    } else {
      nextTick(() => {
        triggerRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

// 候选、账号、profile id/version、授权或 readiness 状态变化 → 原子作废旧确认快照。
// 任何变化都先清勾选并使旧 frozenBirthDate 不可再次提交；可确认状态下用最新
// candidate/currentProfile/accountId 重新冻结，保证展示的 diff 与最终 payload 同源
// （候选与 profile 同时变化也不遗漏：统一走 freezeSnapshot，不提前 return）。
watch(
  [
    () => props.candidate,
    () => props.currentProfile,
    () => props.accountId,
    () => props.conflict,
    () => props.readiness,
  ],
  () => {
    if (!props.show) return
    // 旧同意立即失效；旧快照不可再提交。
    consentChecked.value = false
    frozenBirthDate.value = null
    if (props.conflict || !props.readiness || !props.candidate) {
      return
    }
    // 显式展示新差异：以当前候选/档案/账号重新冻结复制。
    freezeSnapshot()
  },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    if (!props.busy) emit('close')
    return
  }
  if (e.key !== 'Tab') return
  if (!dialogRef.value) return
  const focusable = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.hasAttribute('disabled'))
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (document.activeElement === titleRef.value) {
    e.preventDefault()
    if (e.shiftKey) last.focus()
    else first.focus()
    return
  }

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

// 差异条目：无变化时提示无需保存。
const diff = ref<ReturnType<typeof diffBirthDate> | null>(null)
watch(
  [() => props.currentProfile, () => props.candidate],
  ([currentProfile, candidate]) => {
    diff.value = candidate ? diffBirthDate(currentProfile?.birthDate ?? null, candidate) : null
  },
  { immediate: true },
)

const noChange = computed(() => diff.value?.status === 'kept')

const description = computed(() => (props.candidate ? describeBirthDate(props.candidate) : null))

// conflict 或 readiness=false 期间禁用确认，只能 reload 或关闭。
const canConfirm = computed(
  () =>
    consentChecked.value &&
    !!frozenBirthDate.value &&
    !noChange.value &&
    !props.busy &&
    !props.conflict &&
    props.readiness,
)

function handleConfirm() {
  if (!canConfirm.value || !frozenBirthDate.value) return
  // 冻结载荷随确认发出：expected、accountId 与 raw 候选均为打开时复制，不读可变 props。
  const payload: SaveConfirmPayload = {
    expected: frozenExpected.value,
    accountId: frozenAccountId.value,
    birthDate: frozenBirthDate.value,
    consentPolicyVersion: SELF_PROFILE_POLICY_VERSION,
  }
  emit('confirm', payload)
}

function handleReload() {
  // 显式重新读取：父页面重新 GET 当前档案并回传新 currentProfile/readiness。
  consentChecked.value = false
  emit('reload')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="auth-dialog-wrap" role="presentation" @keydown="onKeydown">
      <!-- 背板 -->
      <div class="auth-dialog-backdrop" aria-hidden="true" @click="!busy && emit('close')" />

      <!-- 弹层 -->
      <div
        ref="dialogRef"
        class="auth-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="self-profile-save-title"
      >
        <h2
          id="self-profile-save-title"
          ref="titleRef"
          tabindex="-1"
          class="font-display text-xl text-ink-dark tracking-[0.15em] mb-4 text-center"
        >
          保存本人档案
        </h2>

        <div
          v-if="conflict"
          class="mb-4 px-4 py-2.5 rounded-lg border text-cinnabar text-sm"
          role="alert"
        >
          <p>档案已在其他页面被修改。请重新读取档案后再发起保存，不要覆盖他人修改。</p>
          <button type="button" class="underline mt-2" :disabled="busy" @click="handleReload">
            重新读取档案
          </button>
        </div>
        <div
          v-else-if="!readiness"
          class="mb-4 px-4 py-2.5 rounded-lg border text-cinnabar text-sm"
          role="alert"
        >
          <p>无法确认当前档案状态，暂不能保存。</p>
          <button type="button" class="underline mt-2" :disabled="busy" @click="handleReload">
            重新读取档案
          </button>
        </div>
        <div
          v-if="error"
          class="mb-4 px-4 py-2.5 rounded-lg border text-cinnabar text-sm"
          role="alert"
        >
          {{ error }}
        </div>

        <div v-if="description && diff" class="space-y-3 mb-5">
          <!-- 差异状态 -->
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            <template v-if="diff.status === 'added'">新增出生日期：</template>
            <template v-else-if="diff.status === 'modified'">修改出生日期：</template>
            <template v-else>出生日期保持不变：</template>
          </p>
          <div class="space-y-1.5 font-sans text-sm text-ink-medium leading-relaxed">
            <p>
              原表达：
              <span v-if="diff.fromRaw">
                {{ diff.fromRaw.calendar === 'lunar' ? '农历' : '公历' }}
                {{ diff.fromRaw.year }}年{{ diff.fromRaw.month }}月{{ diff.fromRaw.day }}日
                <span v-if="diff.fromRaw.calendar === 'lunar'">
                  （{{ diff.fromRaw.isLeapMonth ? '闰月' : '普通月' }}）
                </span>
              </span>
              <span v-else>（无）</span>
            </p>
            <p>
              新表达：
              {{ description.raw.calendar === 'lunar' ? '农历' : '公历' }}
              {{ description.raw.year }}年{{ description.raw.month }}月{{ description.raw.day }}日
              <span v-if="description.raw.calendar === 'lunar'">
                （{{ description.raw.isLeapMonth ? '闰月' : '普通月' }}）
              </span>
            </p>
            <p>
              规范化公历：{{ description.solarDate }}
              <span v-if="diff.fromSolarDate && diff.fromSolarDate !== description.solarDate">
                （原 {{ diff.fromSolarDate }}）
              </span>
            </p>
            <p class="text-xs text-ink-light">转换规则：{{ description.conversionVersion }}</p>
          </div>

          <!-- 无变化提示 -->
          <p v-if="noChange" class="font-sans text-sm text-ink-medium">日期没有变化，无需保存。</p>
        </div>

        <p v-else class="font-sans text-sm text-ink-medium mb-5">没有可保存的档案内容。</p>

        <!-- 长期保存告知：checkbox 默认未选；readiness=false/conflict 时禁用勾选 -->
        <label
          class="flex items-start gap-3 font-sans text-sm text-ink-medium leading-relaxed mb-5"
        >
          <input
            v-model="consentChecked"
            type="checkbox"
            class="mt-1"
            :disabled="busy || noChange || !candidate || !readiness || conflict"
          />
          <span>
            我确认这是本人的出生日期，并同意按当前告知长期保存（版本
            {{
              SELF_PROFILE_POLICY_VERSION
            }}），供我在未来主动带入工具使用。保存不代表保存结果或历史。
          </span>
        </label>

        <div class="flex gap-3">
          <button type="button" class="btn-quiet flex-1" :disabled="busy" @click="emit('close')">
            取消
          </button>
          <button
            type="button"
            class="btn-solid flex-1"
            :disabled="!canConfirm"
            :aria-busy="busy"
            @click="handleConfirm"
          >
            {{ busy ? '保存中...' : '确认保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
