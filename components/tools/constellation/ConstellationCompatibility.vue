<template>
  <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.45s' }">
    <div class="section-header">
      <h2>速配星座</h2>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        v-for="(item, idx) in items"
        :key="item.name"
        class="card-warm rounded-xl p-3 sm:p-4 text-center transition-all duration-300"
        :class="[
          borderClass(item.level),
          expandedIdx === idx ? '' : 'cursor-pointer hover:-translate-y-0.5',
        ]"
        tabindex="0"
        role="button"
        :aria-expanded="expandedIdx === idx"
        @click="toggleExpand(idx)"
        @keydown.enter="toggleExpand(idx)"
      >
        <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.symbol }}</div>
        <div class="font-display text-base text-ink-dark">{{ item.name }}</div>
        <span
          class="inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-sans tracking-wider"
          :class="badgeClass(item.level)"
        >
          {{ item.label }}
        </span>

        <!-- Accordion explanation -->
        <Transition name="expand">
          <div
            v-if="expandedIdx === idx && item.explanation"
            class="mt-2 pt-2 border-t compat-accordion-divider"
          >
            <p
              class="text-left font-sans text-xs text-ink-medium leading-relaxed pl-2 border-l-2"
              :class="
                item.level === 'great'
                  ? 'explain-border--great'
                  : item.level === 'bad'
                    ? 'explain-border--bad'
                    : 'explain-border--neutral'
              "
            >
              {{ item.explanation }}
            </p>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'

defineProps<{
  items: ConstellationResult['compatibility']
}>()

const expandedIdx = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedIdx.value = expandedIdx.value === idx ? null : idx
}

function borderClass(level: string): string {
  return level === 'great'
    ? 'compat-card--great'
    : level === 'good'
      ? 'compat-card--good'
      : 'compat-card--bad'
}

function badgeClass(level: string): string {
  return level === 'great'
    ? 'compat-badge--great'
    : level === 'good'
      ? 'compat-badge--good'
      : 'compat-badge--bad'
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 5rem;
  opacity: 1;
}

/* ── Compatibility card hover borders ── */
.compat-card--great:hover {
  border-color: var(--color-jade);
}
.compat-card--good:hover {
  border-color: var(--color-gold);
}
.compat-card--bad:hover {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
}

/* ── Level badges ── */
.compat-badge--great {
  background: color-mix(in srgb, var(--color-wuxing-wood) 10%, transparent);
  color: var(--color-wuxing-wood);
}
.compat-badge--good {
  background: color-mix(in srgb, var(--color-gold) 10%, transparent);
  color: var(--color-gold);
}
.compat-badge--bad {
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
  color: color-mix(in srgb, var(--color-cinnabar) 80%, transparent);
}

/* ── Explanation border colors ── */
.explain-border--great {
  border-color: color-mix(in srgb, var(--color-wuxing-wood) 40%, transparent);
}
.explain-border--bad {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
}
.explain-border--neutral {
  border-color: color-mix(in srgb, var(--color-ink-faint) 40%, transparent);
}

/* ── Accordion divider ── */
.compat-accordion-divider {
  border-color: color-mix(in srgb, var(--color-paper-dark) 30%, transparent);
}
</style>
