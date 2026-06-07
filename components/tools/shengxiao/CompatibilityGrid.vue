<template>
  <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.5s' }">
    <div class="section-header">
      <h2>生肖配对</h2>
    </div>
    <div class="compatibility-grid grid grid-cols-3 sm:grid-cols-6 gap-3">
      <div
        v-for="(item, idx) in items"
        :key="item.animal"
        class="card-warm rounded-xl p-3 sm:p-4 text-center transition-all duration-300 hover:-translate-y-0.5"
        :class="[
          borderClass(item.level),
          expandedIdx === idx ? 'cursor-default' : 'cursor-pointer',
        ]"
        tabindex="0"
        role="button"
        :aria-expanded="expandedIdx === idx"
        @click="toggleExpand(idx)"
        @keydown.enter="toggleExpand(idx)"
        @keydown.space.prevent="toggleExpand(idx)"
      >
        <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.emoji }}</div>
        <div class="font-display text-base text-ink-dark">{{ item.animal }}</div>
        <span
          class="inline-block mt-1.5 px-2 py-0.5 rounded text-[0.72rem] font-sans tracking-wider"
          :class="levelClass(item.level)"
        >
          {{ item.relation }}
        </span>

        <!-- Accordion explanation -->
        <Transition name="expand">
          <div
            v-if="expandedIdx === idx && item.explanation"
            class="mt-2 pt-2 border-t shengxiao-accordion-divider"
          >
            <p
              class="text-left font-sans text-[0.72rem] text-ink-medium leading-relaxed pl-2 border-l-2"
              :class="
                item.level === 'great'
                  ? 'shengxiao-explain-border--great'
                  : 'shengxiao-explain-border--bad'
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
import type { Compatibility } from '~/composables/useShengXiao'

defineProps<{
  items: Compatibility[]
}>()

const expandedIdx = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedIdx.value = expandedIdx.value === idx ? null : idx
}

function borderClass(level: string): string {
  return level === 'great'
    ? 'shengxiao-compat-card--great'
    : level === 'good'
      ? 'shengxiao-compat-card--good'
      : 'shengxiao-compat-card--bad'
}

function levelClass(level: string): string {
  return level === 'great'
    ? 'shengxiao-compat-badge--great'
    : level === 'good'
      ? 'shengxiao-compat-badge--good'
      : 'shengxiao-compat-badge--bad'
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
  max-height: 10rem;
  opacity: 1;
}

/* ── Grid accent ── */
.compatibility-grid {
  position: relative;
  padding-top: 1rem;
}

.compatibility-grid::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(198, 40, 40, 0.08) 20%,
    rgba(198, 40, 40, 0.12) 50%,
    rgba(198, 40, 40, 0.08) 80%,
    transparent
  );
}

/* ── Compatibility card hover borders ── */
.shengxiao-compat-card--great:hover {
  border-color: var(--color-jade);
}
.shengxiao-compat-card--good:hover {
  border-color: var(--color-gold);
}
.shengxiao-compat-card--bad:hover {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
}

/* ── Level badges ── */
.shengxiao-compat-badge--great {
  background: color-mix(in srgb, var(--color-wuxing-wood) 10%, transparent);
  color: var(--color-wuxing-wood);
}
.shengxiao-compat-badge--good {
  background: color-mix(in srgb, var(--color-gold) 10%, transparent);
  color: var(--color-gold);
}
.shengxiao-compat-badge--bad {
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
  color: color-mix(in srgb, var(--color-cinnabar) 80%, transparent);
}

/* ── Explanation border colors ── */
.shengxiao-explain-border--great {
  border-color: color-mix(in srgb, var(--color-wuxing-wood) 40%, transparent);
}
.shengxiao-explain-border--bad {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
}

/* ── Accordion divider ── */
.shengxiao-accordion-divider {
  border-color: color-mix(in srgb, var(--color-paper-dark) 30%, transparent);
}
</style>
