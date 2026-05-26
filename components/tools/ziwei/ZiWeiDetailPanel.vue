<template>
  <div
    class="bg-paper-medium border border-ink-medium/15 rounded-xl overflow-hidden min-h-[360px] shadow-card"
    role="region"
    aria-label="宫位解读"
  >
    <!-- Empty state -->
    <div
      v-if="!detailView"
      class="flex items-center justify-center h-[360px] text-ink-light tracking-widest text-center p-8"
    >
      <div>
        <div class="text-[1.6rem] mb-1 font-display text-ink-light/40">✦</div>
        <span class="text-xs font-display">点击宫位查看详解</span>
      </div>
    </div>

    <!-- Palace detail content -->
    <div v-else>
      <!-- Header: palace name + branch -->
      <div class="detail-panel-header">
        <div class="flex items-center gap-2">
          <h3 class="detail-palace-name">{{ detailView.name }}</h3>
          <span class="detail-palace-branch">{{ detailView.stem }}{{ detailView.branch }}</span>
        </div>
      </div>

      <!-- Major stars -->
      <div class="detail-section">
        <h4 class="detail-section-title">主星</h4>
        <div v-if="detailView.majorStars.length > 0" class="detail-star-list">
          <div
            v-for="star in detailView.majorStars"
            :key="String(star.name)"
            class="detail-star-item"
          >
            <span
              class="star-dot major"
              :class="getStarColor(star.name)"
            ></span>
            <span class="star-name">{{ star.name }}</span>
            <span v-if="star.brightness" class="star-brightness">{{ star.brightness }}</span>
          </div>
        </div>
        <div v-else class="detail-text" style="opacity: 0.5;">本宫无主星</div>
      </div>

      <!-- Minor stars -->
      <div class="detail-section">
        <h4 class="detail-section-title">辅星</h4>
        <div v-if="detailView.minorStars.length > 0" class="detail-star-list">
          <div
            v-for="star in detailView.minorStars"
            :key="String(star.name)"
            class="detail-star-item"
          >
            <span
              class="star-dot"
              :class="getStarColor(star.name)"
            ></span>
            <span class="star-name">{{ star.name }}</span>
          </div>
        </div>
        <div v-else class="detail-text" style="opacity: 0.5;">本宫无辅星</div>
      </div>

      <!-- Four transformations -->
      <div v-if="detailView.transformations.length > 0" class="detail-section">
        <h4 class="detail-section-title">四化</h4>
        <div class="detail-star-list">
          <div
            v-for="t in detailView.transformations"
            :key="t.star + t.transformation"
            class="detail-star-item"
          >
            <span
              class="mutagen-chip"
              :class="getMutagenClass(t.transformation)"
            >{{ t.star }}化{{ t.transformation }}</span>
          </div>
        </div>
      </div>

      <!-- Interpretation -->
      <div class="detail-section">
        <h4 class="detail-section-title">宫位解读</h4>
        <div class="detail-text">
          <p v-if="detailView.interpretation.palaceSummary">
            <span class="highlight">●</span> {{ detailView.interpretation.palaceSummary }}
          </p>
          <p v-for="(reading, i) in detailView.interpretation.starReadings" :key="i">
            {{ reading }}
          </p>
          <p v-if="detailView.interpretation.combinationNote" class="highlight">
            {{ detailView.interpretation.combinationNote }}
          </p>
        </div>
      </div>

      <!-- Decadal range -->
      <div v-if="detailView.decadalRange && detailView.decadalRange[0] > 0" class="detail-section">
        <h4 class="detail-section-title">大限</h4>
        <div class="detail-text">
          <p>大限 {{ detailView.decadalRange[0] }}-{{ detailView.decadalRange[1] }}，位于 <span class="highlight">{{ detailView.name }}宫</span>。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { StarName } from 'iztro/lib/i18n/types/Star'
import { getDetailedPalaceView } from '~/composables/useZiwei'

const props = defineProps<{
  palace: IFunctionalPalace | null
}>()

const detailView = computed(() => {
  if (!props.palace) return null
  return getDetailedPalaceView(props.palace)
})

/**
 * Star name to color dot class mapping.
 * Categories follow traditional Zi Wei color conventions:
 *   gold     — imperial, noble, earth/metal stars
 *   cinnabar — passionate, war, fire stars
 *   jade     — assisting, growth, wood/water stars
 *   ice      — literary, artistic, water stars
 *   gray     — conflicting, dark, harming stars
 *   purple   — mystical, religious stars
 *   white    — neutral, light stars
 */
const STAR_COLOR_MAP: Record<string, string> = {
  // 14 major stars
  '紫微': 'gold',
  '天机': 'jade',
  '太阳': 'cinnabar',
  '武曲': 'gold',
  '天同': 'jade',
  '廉贞': 'cinnabar',
  '天府': 'gold',
  '太阴': 'ice',
  '贪狼': 'cinnabar',
  '巨门': 'gray',
  '天相': 'jade',
  '天梁': 'gold',
  '七杀': 'cinnabar',
  '破军': 'gray',

  // Common minor / adjunct stars
  '左辅': 'jade',
  '右弼': 'jade',
  '文昌': 'ice',
  '文曲': 'ice',
  '禄存': 'gold',
  '天马': 'ice',
  '擎羊': 'gray',
  '陀罗': 'gray',
  '火星': 'cinnabar',
  '铃星': 'gray',
  '天魁': 'gold',
  '天钺': 'gold',
  '地空': 'gray',
  '地劫': 'gray',
  '天刑': 'gray',
  '天姚': 'cinnabar',
  '解神': 'purple',
  '阴煞': 'gray',
  '天喜': 'cinnabar',
  '红鸾': 'cinnabar',
  '龙池': 'ice',
  '凤阁': 'gold',
  '天官': 'gold',
  '天福': 'gold',
  '天厨': 'gold',
  '天巫': 'jade',
  '月德': 'purple',
  '华盖': 'purple',
  '天德': 'purple',
  '咸池': 'cinnabar',
  '三台': 'jade',
  '八座': 'gold',
  '台辅': 'gold',
  '封诰': 'gold',
  '恩光': 'gold',
  '天贵': 'gold',
  '天才': 'ice',
  '天寿': 'jade',
  '龙德': 'gold',
  '将星': 'gold',
  '攀鞍': 'gold',
}

function getStarColor(name: StarName | string): string {
  return STAR_COLOR_MAP[String(name)] ?? 'gray'
}

const MUTAGEN_CLASS_MAP: Record<string, string> = {
  '禄': 'lu',
  '权': 'quan',
  '科': 'ke',
  '忌': 'ji',
}

function getMutagenClass(transformation: string): string {
  return MUTAGEN_CLASS_MAP[transformation] ?? ''
}
</script>

<style scoped>
/* ── Detail section styles matching demo ── */

.detail-panel-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(93, 78, 55, 0.08);
}

.detail-palace-name {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive;
  font-size: 1.3rem;
  color: #1A1A1A;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-palace-branch {
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 0.65rem;
  color: #8B7D6B;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.5rem;
  border: 1px solid rgba(93, 78, 55, 0.08);
  border-radius: 4px;
}

.detail-section {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid rgba(93, 78, 55, 0.08);
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section-title {
  font-size: 0.6rem;
  color: #8B7D6B;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
  font-weight: 500;
}

.detail-star-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detail-star-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #5D4E37;
  animation: detail-in 0.35s ease-out both;
}

.detail-star-item:nth-child(1) { animation-delay: 0.05s; }
.detail-star-item:nth-child(2) { animation-delay: 0.1s; }
.detail-star-item:nth-child(3) { animation-delay: 0.15s; }

@keyframes detail-in {
  from { opacity: 0; transform: translateX(-6px); }
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

.star-dot.major {
  width: 10px;
  height: 10px;
}

/* Color variants */
.star-dot.gold {
  background: #C62828;
  border-color: #D4A84B;
}

.star-dot.cinnabar {
  background: #A02020;
}

.star-dot.jade {
  background: #4A8C6F;
}

.star-dot.ice {
  background: #6BA8C8;
}

.star-dot.purple {
  background: #7B6FA0;
}

.star-dot.gray {
  background: #5D4E37;
}

.star-dot.white {
  background: #8B7D6B;
}

.star-name {
  font-size: 0.78rem;
  color: #5D4E37;
}

.star-brightness {
  font-size: 10px;
  color: #7A6A5C;
  margin-left: 0.125rem;
}

/* Mutagen chips */
.mutagen-chip {
  font-size: 0.5rem;
  padding: 0.04rem 0.3rem;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: 'Noto Serif SC', serif;
  white-space: nowrap;
}

.mutagen-chip.lu {
  background: rgba(198, 40, 40, 0.12);
  color: #C62828;
}

.mutagen-chip.quan {
  background: rgba(74, 140, 111, 0.12);
  color: #4A8C6F;
}

.mutagen-chip.ke {
  background: rgba(107, 168, 200, 0.12);
  color: #6BA8C8;
}

.mutagen-chip.ji {
  background: rgba(93, 78, 55, 0.1);
  color: #5D4E37;
}

/* Detail text styles */
.detail-text {
  font-size: 0.75rem;
  line-height: 1.7;
  color: #5D4E37;
}

.detail-text p {
  margin-bottom: 0.4rem;
}

.detail-text .highlight,
.highlight {
  color: #C62828;
}
</style>
