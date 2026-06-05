<template>
  <div
    class="detail-panel bg-paper-medium border border-ink-faint/20 rounded-xl overflow-hidden shadow-card"
    role="region"
    aria-label="宫位解读"
  >
    <!-- Empty state -->
    <div
      v-if="!detailView"
      class="flex items-center justify-center p-8"
      style="min-height: 360px;"
    >
      <div class="text-center">
        <div class="text-[2rem] mb-2 font-display text-ink-muted" aria-hidden="true">✦</div>
        <p role="status" class="text-xs text-ink-muted tracking-[0.12em] font-sans">点击宫位查看详解</p>
      </div>
    </div>

    <!-- Palace detail content -->
    <div v-else>
      <!-- Header -->
      <div class="detail-header">
        <div class="flex items-center gap-2.5">
          <h3 class="font-display text-[1.6rem] tracking-[0.06em]" style="color: var(--color-ink-darkest);">{{ detailView.name }}</h3>
          <span class="detail-branch-badge">{{ detailView.stem }}{{ detailView.branch }}</span>
        </div>
      </div>

      <!-- Major stars -->
      <div class="detail-section">
        <h4 class="detail-section-title">
          <span class="title-dot"></span>主星
        </h4>
        <div v-if="detailView.majorStars.length > 0" class="detail-star-list">
          <div
            v-for="star in detailView.majorStars"
            :key="String(star.name)"
            class="detail-star-item"
          >
            <span class="star-dot major" :class="getStarColorClass(star.name)" :aria-label="getStarColorLabel(star.name)"></span>
            <span class="star-name">{{ star.name }}</span>
            <span v-if="star.brightness" class="star-brightness">{{ star.brightness }}</span>
          </div>
        </div>
        <p v-else class="detail-empty-text">本宫无主星</p>
      </div>

      <!-- Minor stars -->
      <div class="detail-section">
        <h4 class="detail-section-title">
          <span class="title-dot"></span>辅星
        </h4>
        <div v-if="detailView.minorStars.length > 0" class="detail-star-list">
          <div
            v-for="star in detailView.minorStars"
            :key="String(star.name)"
            class="detail-star-item"
          >
            <span class="star-dot" :class="getStarColorClass(star.name)" :aria-label="getStarColorLabel(star.name)"></span>
            <span class="star-name">{{ star.name }}</span>
          </div>
        </div>
        <p v-else class="detail-empty-text">本宫无辅星</p>
      </div>

      <!-- Adjective stars (shown only in detail panel, hidden from celestial chart) -->
      <div class="detail-section">
        <h4 class="detail-section-title">
          <span class="title-dot"></span>杂曜
          <span class="text-[0.6875rem] text-ink-muted font-normal ml-1">（天星图不显）</span>
        </h4>
        <div v-if="detailView.adjectiveStars.length > 0" class="detail-star-list">
          <div
            v-for="star in detailView.adjectiveStars"
            :key="String(star.name)"
            class="detail-star-item"
          >
            <span class="star-dot" :class="getStarColorClass(star.name)" :aria-label="getStarColorLabel(star.name)"></span>
            <span class="star-name">{{ star.name }}</span>
          </div>
        </div>
        <p v-else class="detail-empty-text">本宫无杂曜</p>
      </div>

      <!-- Four transformations -->
      <div v-if="detailView.transformations.length > 0" class="detail-section">
        <h4 class="detail-section-title">
          <span class="title-dot"></span>四化
        </h4>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="t in detailView.transformations"
            :key="t.star + t.transformation"
            class="mutagen-chip"
            :class="getMutagenClass(t.transformation)"
          >{{ t.star }} · 化{{ t.transformation }}</span>
        </div>
      </div>

      <!-- Interpretation -->
      <div class="detail-section">
        <h4 class="detail-section-title">
          <span class="title-dot"></span>宫位解读
        </h4>
        <div class="detail-text">
          <p v-if="detailView.interpretation.palaceSummary" class="summary-line">
            {{ detailView.interpretation.palaceSummary }}
          </p>
          <p v-for="(reading, i) in detailView.interpretation.starReadings" :key="i" class="reading-line">
            {{ reading }}
          </p>
          <p v-if="detailView.interpretation.combinationNote" class="combination-note">
            {{ detailView.interpretation.combinationNote }}
          </p>
        </div>
      </div>

      <!-- Full interpretation (combined synthesis) -->
      <div class="detail-section">
        <h4 class="detail-section-title">
          <span class="title-dot"></span>综合解读
          <span class="text-[0.6875rem] text-ink-muted font-normal ml-1">（全文）</span>
        </h4>
        <p class="full-interpretation-text">{{ detailView.fullInterpretation }}</p>
      </div>

      <!-- Decadal range -->
      <div v-if="detailView.decadalRange && detailView.decadalRange[0] > 0" class="detail-section">
        <h4 class="detail-section-title">
          <span class="title-dot"></span>大限
        </h4>
        <p class="detail-text">
          {{ detailView.decadalRange[0] }}–{{ detailView.decadalRange[1] }}岁，行 <span class="text-cinnabar font-medium">{{ detailView.name }}宫</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { StarName } from 'iztro/lib/i18n/types/Star'
import { getDetailedPalaceView } from '~/composables/useZiwei'
import { getStarColorClass } from '~/constants/ziwei'
import type { StarColorClass } from '~/constants/ziwei'

const props = defineProps<{
  palace: IFunctionalPalace | null
}>()

const detailView = computed(() => {
  if (!props.palace) return null
  return getDetailedPalaceView(props.palace)
})

const STAR_COLOR_LABEL_MAP: Record<StarColorClass, string> = {
  'gold': '主星', 'jade': '辅星', 'cinnabar': '煞星', 'ice': '文星', 'purple': '吉星', 'gray': '杂曜', 'white': '杂曜',
}

function getStarColorLabel(name: StarName | string): string {
  const color = getStarColorClass(name)
  return STAR_COLOR_LABEL_MAP[color] ?? '杂曜'
}

const MUTAGEN_CLASS_MAP: Record<string, string> = {
  '禄': 'lu', '权': 'quan', '科': 'ke', '忌': 'ji',
}

function getMutagenClass(transformation: string): string {
  return MUTAGEN_CLASS_MAP[transformation] ?? ''
}
</script>

<style scoped>
/* ── Panel structure ── */
.detail-panel {
  min-height: 360px;
}

.detail-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink-muted) 7%, transparent);
}

.detail-branch-badge {
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 0.75rem;
  color: var(--color-ink-muted);
  letter-spacing: 0.08em;
  padding: 0.08rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--color-ink-muted) 10%, transparent);
  border-radius: 3px;
}

.detail-section {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink-muted) 6%, transparent);
}
.detail-section:last-child { border-bottom: none; }

/* ── Section titles ── */
.detail-section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.6875rem;
  color: var(--color-ink);
  letter-spacing: 0.14em;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
}

.title-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-cinnabar);
  opacity: 0.5;
  flex-shrink: 0;
}

/* ── Star list ── */
.detail-star-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-star-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: var(--color-ink-muted);
  animation: detail-in 0.3s ease-out both;
}
.detail-star-item:nth-child(1) { animation-delay: 0.03s; }
.detail-star-item:nth-child(2) { animation-delay: 0.08s; }
.detail-star-item:nth-child(3) { animation-delay: 0.13s; }
.detail-star-item:nth-child(4) { animation-delay: 0.18s; }

@keyframes detail-in {
  from { opacity: 0; transform: translateX(-4px); }
  to { opacity: 1; transform: translateX(0); }
}

.star-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid transparent;
}
.star-dot.major { width: 11px; height: 11px; }

.star-dot.gold     { background: var(--color-cinnabar); border-color: color-mix(in srgb, var(--color-gold) 50%, transparent); }
.star-dot.cinnabar { background: var(--color-cinnabar-dark); }
.star-dot.jade     { background: var(--color-jade); }
.star-dot.ice      { background: var(--color-star-ice); }
.star-dot.purple   { background: var(--color-star-purple); }
.star-dot.gray     { background: var(--color-ink-muted); }
.star-dot.white    { background: var(--color-ink-light); }

.star-name {
  font-size: 0.85rem;
  color: var(--color-ink-muted);
  font-family: 'Noto Sans SC', sans-serif;
}

.star-brightness {
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  margin-left: 0.125rem;
}

/* ── Mutagen chips ── */
.mutagen-chip {
  font-size: 0.6875rem;
  padding: 0.06rem 0.4rem;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: var(--font-sans);
  white-space: nowrap;
}
.mutagen-chip.lu   { background: color-mix(in srgb, var(--color-cinnabar) 12%, transparent); color: var(--color-cinnabar); border: 0.5px solid color-mix(in srgb, var(--color-cinnabar) 15%, transparent); }
.mutagen-chip.quan { background: color-mix(in srgb, var(--color-jade) 12%, transparent); color: var(--color-jade); border: 0.5px solid color-mix(in srgb, var(--color-jade) 15%, transparent); }
.mutagen-chip.ke   { background: color-mix(in srgb, #6BA8C8 12%, transparent); color: #6BA8C8; border: 0.5px solid color-mix(in srgb, #6BA8C8 15%, transparent); }
.mutagen-chip.ji   { background: color-mix(in srgb, var(--color-ink-muted) 7%, transparent); color: var(--color-ink-muted); border: 0.5px solid color-mix(in srgb, var(--color-ink-muted) 10%, transparent); }

/* ── Text content ── */
.detail-text {
  font-size: 0.82rem;
  line-height: 1.75;
  color: var(--color-ink-muted);
}

.summary-line {
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
  border-left: 2px solid color-mix(in srgb, var(--color-cinnabar) 25%, transparent);
}

.reading-line {
  margin-bottom: 0.3rem;
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--color-ink-medium);
}

.combination-note {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--color-cinnabar);
}

.full-interpretation-text {
  font-size: 0.78rem;
  line-height: 1.8;
  color: var(--color-ink-medium);
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--color-ink-faint) 4%, transparent);
  border-radius: 4px;
  border-left: 2px solid color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
}

.detail-empty-text {
  font-size: 0.78rem;
  color: var(--color-ink-muted);
  font-style: italic;
}

@media (prefers-reduced-motion: reduce) {
  .detail-star-item { animation: none; opacity: 1; }
}
</style>
