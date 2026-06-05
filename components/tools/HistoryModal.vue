<script setup lang="ts">
import { getZodiacIndex, ZODIACS } from '~/composables/useConstellation'
import { getAnimal } from '~/constants/bazi'
import type { DivinationType } from '~/server/api/divinations/shared'

const props = defineProps<{
  show: boolean
  type: DivinationType
}>()

const emit = defineEmits<{
  close: []
  restore: [recordId: number]
}>()

const { getAuthHeaders } = useAuth()

const records = ref<Array<{ id: number; type: string; input_data: unknown; created_at: string }>>(
  [],
)
const loading = ref(false)
const fetchError = ref('')
const listRef = ref<HTMLUListElement | null>(null)
const closeButtonRef = ref<HTMLElement | null>(null)
const activeOptionIdx = ref(0)

watch(
  () => props.show,
  val => {
    if (val) {
      fetchHistory()
      nextTick(() => {
        closeButtonRef.value?.focus()
      })
    }
  },
)

function trapFocusBack() {
  closeButtonRef.value?.focus()
}

function trapFocusForward() {
  if (listRef.value) {
    const items = Array.from(listRef.value.querySelectorAll<HTMLElement>('[role="option"]'))
    if (items.length > 0) {
      items[items.length - 1].focus()
      return
    }
  }
  closeButtonRef.value?.focus()
}

async function fetchHistory() {
  loading.value = true
  records.value = []
  fetchError.value = ''
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const data = await $fetch<Array<import('~/server/api/divinations/shared').DivinationListItem>>(
      `/api/divinations?type=${props.type}`,
      { headers },
    )
    records.value = data.slice(0, 5)
  } catch {
    records.value = []
    fetchError.value = '历史记录加载失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

function formatHistoryDate(dateStr: string): string {
  try {
    // SQLite 'datetime' returns space-separated ("2026-05-31 12:34:56") not ISO with 'T'
    const [datePart, timePart] = dateStr.includes('T') ? dateStr.split('T') : dateStr.split(' ')
    if (!datePart) return dateStr
    const [y, m, d] = datePart.split('-').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    if (timePart) {
      // timePart may be "12:34:56" or "12:34:56.000Z"; destructuring first two elements works for both
      const [hh, mm] = timePart.split(':').map(Number)
      return `${y}-${pad(m)}-${pad(d)} ${pad(hh)}:${pad(mm)}`
    }
    return `${y}-${pad(m)}-${pad(d)}`
  } catch {
    return dateStr
  }
}

function formatHistoryLabel(inputData: Record<string, unknown>): string {
  if (!inputData) return ''
  if (props.type === 'bazi') {
    const { birthYear, birthMonth, birthDay, gender } = inputData
    const pad = (n: number | undefined) => (n ? String(n).padStart(2, '0') : '??')
    let label = `${birthYear || '??'}-${pad(birthMonth)}-${pad(birthDay)}`
    if (gender) label += ` ${gender}`
    return label
  }
  if (props.type === 'shengxiao') {
    const year = inputData.representativeYear
    if (!year) return ''
    return `${year}年 生肖${getAnimal(year)}`
  }
  if (props.type === 'ziwei') {
    // Precomputed rich label stored at save time
    if (inputData.historyLabel) return inputData.historyLabel as string
    // Fallback: construct from individual fields
    const { birthYear, birthMonth, birthDay, birthHour, gender } = inputData
    if (!birthYear || !birthMonth || !birthDay) return ''
    const pad = (n: number | undefined) => (n ? String(n).padStart(2, '0') : '??')
    const label = `${birthYear}-${pad(birthMonth)}-${pad(birthDay)}`
    const hourLabel = birthHour !== undefined && birthHour !== null ? ` 第${birthHour + 1}时` : ''
    const genderLabel = gender ? ` ${gender === 'male' ? '男' : '女'}` : ''
    return `${label}${hourLabel}${genderLabel}`
  }
  if (props.type === 'yijing') {
    const hexagramName = inputData.hexagramName
    const castingMode = inputData.castingMode === 'number' ? '数字' : '摇卦'
    if (hexagramName) {
      return `${hexagramName}（${castingMode}）`
    }
    // Fallback: show just the casting mode
    return `六爻占卜（${castingMode}）`
  }
  if (props.type === 'name-test') {
    const { surname, givenName } = inputData
    if (!surname && !givenName) return ''
    return `${surname || ''}${givenName || ''}`
  }
  if (props.type === 'hehun') {
    const nickname = inputData.personB_nickname
    return nickname ? `合婚 · ${nickname}` : '合婚'
  }
  if (props.type === 'zeji') {
    const eventName = inputData.eventName
    return eventName ? `择吉 · ${eventName}` : '择吉'
  }
  // constellation
  const { month, day } = inputData
  if (!month || !day) return ''
  const idx = getZodiacIndex(month, day)
  return `${month}月${day}日 ${ZODIACS[idx].name}`
}

function onClickRecord(id: number) {
  emit('restore', id)
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (!listRef.value) return
  const items = Array.from(listRef.value.querySelectorAll<HTMLElement>('[role="option"]'))
  if (items.length === 0) return

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    activeOptionIdx.value =
      e.key === 'ArrowDown'
        ? (activeOptionIdx.value + 1) % items.length
        : (activeOptionIdx.value - 1 + items.length) % items.length
    items[activeOptionIdx.value]?.focus()
  }
}

function onListboxFocus() {
  if (!listRef.value) return
  const items = Array.from(listRef.value.querySelectorAll<HTMLElement>('[role="option"]'))
  if (items.length > 0 && items[activeOptionIdx.value]) {
    items[activeOptionIdx.value].focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop: dark ink wash with subtle blur -->
        <div
          class="absolute inset-0 bg-ink-dark/40 backdrop-blur-[2px]"
          aria-hidden="true"
          @click="emit('close')"
        />

        <!-- Card: star almanac scroll -->
        <div
          role="dialog"
          aria-modal="true"
          aria-label="测算历史记录"
          class="relative card-warm rounded-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden shadow-elevated p-8"
          @click.stop
          @keydown="handleKeydown"
        >
          <!-- Top focus trap sentinel — catches Shift+Tab from close button -->
          <div tabindex="0" class="focus-trap-sentinel" @focus="trapFocusForward" />
          <!-- ── Header ── -->
          <div class="px-8 pt-8 pb-4 flex-shrink-0">
            <!-- Top ink line -->
            <div class="h-px bg-ink-dark/15 mb-5" aria-hidden="true" />

            <!-- Title row -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <h2 class="font-display text-lg tracking-[0.3em] text-ink-dark select-none">
                  测 算 历 史
                </h2>
                <!-- Mini seal mark -->
                <span
                  class="inline-block w-2.5 h-2.5 bg-cinnabar/50 rounded-sm flex-shrink-0"
                  aria-hidden="true"
                />
              </div>

              <!-- Close: "闭" seal button -->
              <button
                ref="closeButtonRef"
                class="history-close-btn"
                aria-label="关闭历史记录"
                @click="emit('close')"
                @keydown.enter="emit('close')"
                @keydown.space.prevent="emit('close')"
              >
                <span>闭</span>
              </button>
            </div>
            <p class="font-sans text-[10px] text-ink-light/80 text-right mt-2 select-none">
              最近 5 条
            </p>
          </div>

          <!-- ── Content ── -->
          <div class="flex-1 overflow-y-auto px-8 pb-8">
            <!-- Loading: three skeleton lines -->
            <div v-if="loading" class="py-10 space-y-6" role="status" aria-label="加载中">
              <div v-for="i in 3" :key="i" class="flex items-center gap-3">
                <div
                  class="w-0.5 h-10 bg-ink-dark/10 flex-shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <div class="flex-1 space-y-2">
                  <div class="h-3 bg-ink-dark/8 rounded w-20 animate-pulse" />
                  <div class="h-4 bg-ink-dark/8 rounded w-36 animate-pulse" />
                </div>
              </div>
            </div>

            <!-- Error: failed to load -->
            <template v-if="fetchError">
              <div class="text-ink-light/70 text-sm text-center py-8">
                <p>{{ fetchError }}</p>
                <button class="btn-seal mt-4" @click="fetchHistory">重试</button>
              </div>
            </template>

            <!-- Empty: ancient ledger void -->
            <div v-else-if="records.length === 0" class="py-20 text-center">
              <p class="font-display text-lg text-ink-muted mb-2 select-none">卷帙尚空</p>
              <p class="font-sans text-xs text-ink-muted select-none">测算后方可留存</p>
            </div>

            <!-- Records list -->
            <ul
              v-else
              ref="listRef"
              role="listbox"
              aria-label="历史记录列表"
              tabindex="0"
              @focus="onListboxFocus"
            >
              <li
                v-for="(rec, idx) in records"
                :key="rec.id"
                class="history-record group cursor-pointer"
                :style="{ animationDelay: `${idx * 0.04}s` }"
                role="option"
                :tabindex="idx === activeOptionIdx ? 0 : -1"
                @click="onClickRecord(rec.id)"
                @keydown.enter="onClickRecord(rec.id)"
                @keydown.space.prevent="onClickRecord(rec.id)"
              >
                <!-- Left accent bar -->
                <span class="history-record-bar flex-shrink-0" aria-hidden="true" />

                <!-- Entry content -->
                <div class="flex-1 min-w-0 py-3 border-b border-paper-dark/30">
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-sans text-xs text-ink-light mb-1">
                        {{ formatHistoryDate(rec.created_at) }}
                      </p>
                      <p class="font-sans text-sm text-ink-dark truncate">
                        {{ formatHistoryLabel(rec.input_data) }}
                      </p>
                    </div>
                    <!-- Right arrow: appears on hover -->
                    <span class="history-record-arrow flex-shrink-0 ml-2" aria-hidden="true"
                      >&#8594;</span
                    >
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <!-- Focus trap sentinel — cycles Tab back to close button -->
          <div tabindex="0" class="focus-trap-sentinel" @focus="trapFocusBack" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   Transition: backdrop + card entrance
   ═══════════════════════════════════════════════ */

.modal-enter-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active :deep(.card-warm) {
  transition:
    opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-leave-active :deep(.card-warm) {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from :deep(.card-warm),
.modal-leave-to :deep(.card-warm) {
  opacity: 0;
  transform: scale(0.96);
}

/* ═══════════════════════════════════════════════
   Close Button: "闭" seal stamp
   ═══════════════════════════════════════════════ */

.history-close-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1.5px solid rgba(107, 91, 79, 0.4);
  color: rgba(107, 91, 79, 0.45);
  background: transparent;
  cursor: pointer;
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background-color 0.25s ease;
}
.history-close-btn span {
  font-family: var(--font-display);
  font-size: 1rem;
  line-height: 1;
}
.history-close-btn:hover {
  color: var(--color-cinnabar);
  border-color: rgba(198, 40, 40, 0.55);
  background-color: rgba(198, 40, 40, 0.04);
}
.history-close-btn:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}

/* ═══════════════════════════════════════════════
   Record Items: ledger entries
   ═══════════════════════════════════════════════ */

.history-record {
  display: flex;
  align-items: stretch;
  gap: 0.875rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
  animation: recordFadeIn 0.4s ease both;
  outline: none;
}
.history-record:hover {
  background-color: rgba(224, 213, 192, 0.2); /* paper-dark/20 */
}
.history-record:focus-visible {
  background-color: rgba(224, 213, 192, 0.2);
  box-shadow: inset 0 0 0 2px var(--color-cinnabar);
  border-radius: 0.25rem;
}

/* Left accent bar */
.history-record-bar {
  width: 2px;
  background: rgba(198, 40, 40, 0.2);
  transition: background-color 0.25s ease;
  border-radius: 1px;
  margin: 4px 0;
}
.history-record:hover .history-record-bar,
.history-record:focus-visible .history-record-bar {
  background: var(--color-cinnabar);
}

/* Right-pointing arrow */
.history-record-arrow {
  font-size: 0.9375rem;
  color: rgba(198, 40, 40, 0);
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease,
    color 0.25s ease;
}
.history-record:hover .history-record-arrow,
.history-record:focus-visible .history-record-arrow {
  opacity: 1;
  transform: translateX(0);
  color: rgba(198, 40, 40, 0.6);
}

/* ═══════════════════════════════════════════════
   Staggered entrance for record items
   ═══════════════════════════════════════════════ */

@keyframes recordFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .history-record {
    animation: none;
  }
}
</style>
