<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show && isBelowLg"
        class="fixed inset-0 z-50 flex flex-col justify-end"
        @keydown="handleKeydown"
      >
        <!-- Backdrop: dark ink wash -->
        <div
          class="absolute inset-0 bg-ink-dark/40 backdrop-blur-[2px]"
          @click="emit('close')"
          aria-hidden="true"
        />

        <!-- Sheet panel: unrolled scroll -->
        <div
          ref="sheetRef"
          role="dialog"
          aria-modal="true"
          :aria-label="`${palace?.name ?? '宫位'}解读`"
          class="relative bg-paper rounded-t-2xl shadow-elevated max-h-[78vh] flex flex-col overflow-hidden"
          @click.stop
        >
          <!-- Scroll-rod top ornament -->
          <div class="h-0.5 flex-shrink-0" style="background: linear-gradient(90deg, transparent, rgba(198,40,40,0.35) 20%, #C62828 50%, rgba(198,40,40,0.35) 80%, transparent);" />
          <div class="h-px bg-ink-faint/10 flex-shrink-0" />

          <!-- Drag handle -->
          <div class="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div class="w-9 h-1 rounded-full bg-ink-faint/30" aria-hidden="true" />
          </div>

          <!-- Header row -->
          <div class="flex items-center justify-between px-5 py-1.5 flex-shrink-0">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2 h-2 rounded-full bg-cinnabar/40 flex-shrink-0" aria-hidden="true" />
              <h3 class="font-display text-lg tracking-[0.12em] text-ink-dark truncate">
                {{ palace?.name ?? '' }}解读
              </h3>
              <span v-if="palace" class="font-sans text-[11px] text-ink-light/50 tracking-[0.06em] flex-shrink-0 border border-ink-faint/15 rounded px-1.5 py-0.5">
                {{ palace.heavenlyStem }}{{ palace.earthlyBranch }}
              </span>
            </div>
            <button
              ref="closeButtonRef"
              class="sheet-close-btn flex-shrink-0 ml-2"
              @click="emit('close')"
              @keydown.enter="emit('close')"
              @keydown.space.prevent="emit('close')"
              aria-label="关闭宫位解读"
            >
              <span>闭</span>
            </button>
          </div>

          <!-- Divider -->
          <div class="mx-5 h-px bg-ink-faint/15 flex-shrink-0" />

          <!-- Scrollable content area -->
          <div class="flex-1 overflow-y-auto px-0 pt-0.5 pb-5">
            <ZiWeiDetailPanel :palace="palace" />
          </div>

          <!-- Focus trap sentinel -->
          <div
            tabindex="0"
            class="focus-trap-sentinel"
            aria-hidden="true"
            @focus="trapFocusBack"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import ZiWeiDetailPanel from './ZiWeiDetailPanel.vue'

const props = defineProps<{
  show: boolean
  palace: IFunctionalPalace | null
}>()

const emit = defineEmits<{
  close: []
}>()

const sheetRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLElement | null>(null)

// Responsive: only show below lg breakpoint (1024px)
const isBelowLg = ref(true)

onMounted(() => {
  isBelowLg.value = window.innerWidth < 1024
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

function onResize() {
  isBelowLg.value = window.innerWidth < 1024
}

// Focus management
watch(() => props.show, (val) => {
  if (val) {
    nextTick(() => {
      closeButtonRef.value?.focus()
    })
  }
})

function trapFocusBack() {
  closeButtonRef.value?.focus()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   Transition: backdrop + sheet slide-up
   ═══════════════════════════════════════════════ */

.sheet-enter-active {
  transition: opacity 0.28s ease;
}
.sheet-enter-active > .relative {
  transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-leave-active > .relative {
  transition: transform 0.2s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from > .relative,
.sheet-leave-to > .relative {
  transform: translateY(100%);
}

/* ═══════════════════════════════════════════════
   Close button — "闭" seal stamp
   ═══════════════════════════════════════════════ */

.sheet-close-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1.5px solid rgba(107, 91, 79, 0.35);
  color: rgba(107, 91, 79, 0.4);
  background: transparent;
  cursor: pointer;
  transition:
    color 0.25s ease,
    border-color 0.25s ease,
    background-color 0.25s ease;
}
.sheet-close-btn span {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive;
  font-size: 0.9375rem;
  line-height: 1;
}
.sheet-close-btn:hover {
  color: #C62828;
  border-color: rgba(198, 40, 40, 0.55);
  background-color: rgba(198, 40, 40, 0.04);
}
.sheet-close-btn:focus-visible {
  outline: 2px solid #C62828;
  outline-offset: 2px;
}

/* ═══════════════════════════════════════════════
   Focus trap sentinel (invisible)
   ═══════════════════════════════════════════════ */

.focus-trap-sentinel {
  width: 0;
  height: 0;
  overflow: hidden;
}

/* ═══════════════════════════════════════════════
   Accessibility: reduced motion
   ═══════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active > .relative,
  .sheet-leave-active > .relative {
    transition: none;
  }
  .sheet-enter-from > .relative,
  .sheet-leave-to > .relative {
    transform: none;
  }
}
</style>
