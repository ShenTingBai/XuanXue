<script setup lang="ts">
import { getZodiacIndex, ZODIACS } from '~/composables/useConstellation'
import { getAnimal } from '~/constants/bazi'

const props = defineProps<{
  show: boolean
  type: 'bazi' | 'shengxiao' | 'constellation' | 'yijing' | 'ziwei'
}>()

const emit = defineEmits<{
  close: []
  restore: [recordId: number]
}>()

const { getAuthHeaders } = useAuth()

const records = ref<Array<{ id: number; type: string; input_data: any; created_at: string }>>([])
const loading = ref(false)
const listRef = ref<HTMLUListElement | null>(null)

watch(() => props.show, (val) => {
  if (val) {
    fetchHistory()
  }
})

async function fetchHistory() {
  loading.value = true
  records.value = []
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const data = await $fetch<Array<{ id: number; type: string; input_data: any; created_at: string }>>(
      `/api/divinations?type=${props.type}`,
      { headers },
    )
    records.value = data.slice(0, 10)
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
}

function formatHistoryDate(dateStr: string): string {
  try {
    // Parse ISO timestamp manually to avoid timezone ambiguity (CLAUDE.md convention)
    const [datePart, timePart] = dateStr.split('T')
    if (!datePart) return dateStr
    const [y, m, d] = datePart.split('-').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    if (timePart) {
      const [hh, mm] = timePart.split(':').map(Number)
      return `${y}-${pad(m)}-${pad(d)} ${pad(hh)}:${pad(mm)}`
    }
    return `${y}-${pad(m)}-${pad(d)}`
  } catch {
    return dateStr
  }
}

function formatHistoryLabel(inputData: any): string {
  if (!inputData) return ''
  if (props.type === 'bazi') {
    const { birthYear, birthMonth, birthDay, gender } = inputData
    const pad = (n: number | undefined) => n ? String(n).padStart(2, '0') : '??'
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
    const { birthDate, gender } = inputData
    if (!birthDate) return ''
    let label = `${birthDate}`
    if (gender) label += ` ${gender === 'male' ? '男' : '女'}`
    return label
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
  const currentIdx = items.indexOf(document.activeElement as HTMLElement)

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const nextIdx = e.key === 'ArrowDown'
      ? (currentIdx < 0 ? 0 : (currentIdx + 1) % items.length)
      : (currentIdx < 0 ? items.length - 1 : (currentIdx - 1 + items.length) % items.length)
    items[nextIdx].focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop: dark ink wash with subtle blur -->
        <div
          class="absolute inset-0 bg-ink-dark/40 backdrop-blur-[2px]"
          @click="emit('close')"
          aria-hidden="true"
        />

        <!-- Card: star almanac scroll -->
        <div
          class="relative card-paper-solid rounded-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden shadow-elevated p-8"
          @click.stop
          @keydown="handleKeydown"
        >
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
                class="history-close-btn"
                @click="emit('close')"
                @keydown.enter="emit('close')"
                @keydown.space.prevent="emit('close')"
                aria-label="关闭历史记录"
              >
                <span>闭</span>
              </button>
            </div>
          </div>

          <!-- ── Content ── -->
          <div class="flex-1 overflow-y-auto px-8 pb-8">

            <!-- Loading: three skeleton lines -->
            <div v-if="loading" class="py-10 space-y-6" role="status" aria-label="加载中">
              <div v-for="i in 3" :key="i" class="flex items-center gap-3">
                <div class="w-0.5 h-10 bg-ink-dark/10 flex-shrink-0 rounded-full" aria-hidden="true" />
                <div class="flex-1 space-y-2">
                  <div class="h-3 bg-ink-dark/8 rounded w-20 animate-pulse" />
                  <div class="h-4 bg-ink-dark/8 rounded w-36 animate-pulse" />
                </div>
              </div>
            </div>

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
            >
              <li
                v-for="(rec, idx) in records"
                :key="rec.id"
                class="history-record group cursor-pointer"
                :style="{ animationDelay: `${idx * 0.04}s` }"
                role="option"
                tabindex="0"
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
                    <span
                      class="history-record-arrow flex-shrink-0 ml-2"
                      aria-hidden="true"
                    >&#8594;</span>
                  </div>
                </div>
              </li>
            </ul>

          </div>
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
.modal-enter-active :deep(> .card-paper-solid) {
  transition:
    opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-leave-active :deep(> .card-paper-solid) {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from :deep(> .card-paper-solid),
.modal-leave-to :deep(> .card-paper-solid) {
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
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive;
  font-size: 1rem;
  line-height: 1;
}
.history-close-btn:hover {
  color: #C62828;
  border-color: rgba(198, 40, 40, 0.55);
  background-color: rgba(198, 40, 40, 0.04);
}
.history-close-btn:focus-visible {
  outline: 2px solid #C62828;
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
  box-shadow: inset 0 0 0 2px #C62828;
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
  background: #C62828;
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
</style>
