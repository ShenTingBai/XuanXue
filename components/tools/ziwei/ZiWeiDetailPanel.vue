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
        <div class="text-[2rem] mb-2 font-display text-ink-light/25" aria-hidden="true">✦</div>
        <p role="status" class="text-xs text-ink-light/50 tracking-[0.12em] font-sans">点击宫位查看详解</p>
      </div>
    </div>

    <!-- Palace detail content -->
    <div v-else>
      <!-- Header -->
      <div class="detail-header">
        <div class="flex items-center gap-2.5">
          <h3 class="font-display text-[1.6rem] tracking-[0.06em]" style="color: #1A0F0A;">{{ detailView.name }}</h3>
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
            <span class="star-dot major" :class="getStarColor(star.name)" :aria-label="getStarColorLabel(star.name)"></span>
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
            <span class="star-dot" :class="getStarColor(star.name)" :aria-label="getStarColorLabel(star.name)"></span>
            <span class="star-name">{{ star.name }}</span>
          </div>
        </div>
        <p v-else class="detail-empty-text">本宫无辅星</p>
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

const props = defineProps<{
  palace: IFunctionalPalace | null
}>()

const detailView = computed(() => {
  if (!props.palace) return null
  return getDetailedPalaceView(props.palace)
})

const STAR_COLOR_MAP: Record<string, string> = {
  '紫微': 'gold', '天机': 'jade', '太阳': 'cinnabar', '武曲': 'gold',
  '天同': 'jade', '廉贞': 'cinnabar', '天府': 'gold', '太阴': 'ice',
  '贪狼': 'cinnabar', '巨门': 'gray', '天相': 'jade', '天梁': 'gold',
  '七杀': 'cinnabar', '破军': 'gray',
  '左辅': 'jade', '右弼': 'jade', '文昌': 'ice', '文曲': 'ice',
  '禄存': 'gold', '天马': 'ice', '擎羊': 'gray', '陀罗': 'gray',
  '火星': 'cinnabar', '铃星': 'gray', '天魁': 'gold', '天钺': 'gold',
  '地空': 'gray', '地劫': 'gray', '天刑': 'gray', '天姚': 'cinnabar',
  '解神': 'purple', '阴煞': 'gray', '天喜': 'cinnabar', '红鸾': 'cinnabar',
  '龙池': 'ice', '凤阁': 'gold', '天官': 'gold', '天福': 'gold',
  '天厨': 'gold', '天巫': 'jade', '月德': 'purple', '华盖': 'purple',
  '天德': 'purple', '咸池': 'cinnabar', '三台': 'jade', '八座': 'gold',
  '台辅': 'gold', '封诰': 'gold', '恩光': 'gold', '天贵': 'gold',
  '天才': 'ice', '天寿': 'jade', '龙德': 'gold', '将星': 'gold', '攀鞍': 'gold',
}

const STAR_COLOR_LABEL_MAP: Record<string, string> = {
  'gold': '主星', 'jade': '辅星', 'cinnabar': '煞星', 'ice': '文星', 'purple': '吉星', 'gray': '杂曜',
}

function getStarColor(name: StarName | string): string {
  return STAR_COLOR_MAP[String(name)] ?? 'gray'
}

function getStarColorLabel(name: StarName | string): string {
  const color = getStarColor(name)
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
  border-bottom: 1px solid rgba(93, 78, 55, 0.07);
}

.detail-branch-badge {
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 0.75rem;
  color: rgba(94, 80, 69, 0.6);
  letter-spacing: 0.08em;
  padding: 0.08rem 0.5rem;
  border: 1px solid rgba(93, 78, 55, 0.1);
  border-radius: 3px;
}

.detail-section {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid rgba(93, 78, 55, 0.06);
}
.detail-section:last-child { border-bottom: none; }

/* ── Section titles ── */
.detail-section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  color: #4A3828;
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
  background: #C62828;
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
  color: #5D4E37;
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

.star-dot.gold     { background: #C62828; border-color: rgba(212,168,75,0.5); }
.star-dot.cinnabar { background: #B71C1C; }
.star-dot.jade     { background: #3D6B4B; }
.star-dot.ice      { background: #6BA8C8; }
.star-dot.purple   { background: #7B6FA0; }
.star-dot.gray     { background: #5D4E37; }
.star-dot.white    { background: #8B7D6B; }

.star-name {
  font-size: 0.85rem;
  color: #5D4E37;
  font-family: 'Noto Sans SC', sans-serif;
}

.star-brightness {
  font-size: 11px;
  color: #7A6A5C;
  margin-left: 0.125rem;
}

/* ── Mutagen chips ── */
.mutagen-chip {
  font-size: 0.6rem;
  padding: 0.06rem 0.4rem;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: 'Noto Serif SC', serif;
  white-space: nowrap;
}
.mutagen-chip.lu   { background: rgba(198,40,40,0.12); color: #C62828; border: 0.5px solid rgba(198,40,40,0.15); }
.mutagen-chip.quan { background: rgba(74,140,111,0.12); color: #4A8C6F; border: 0.5px solid rgba(74,140,111,0.15); }
.mutagen-chip.ke   { background: rgba(107,168,200,0.12); color: #6BA8C8; border: 0.5px solid rgba(107,168,200,0.15); }
.mutagen-chip.ji   { background: rgba(93,78,55,0.07); color: #5D4E37; border: 0.5px solid rgba(93,78,55,0.1); }

/* ── Text content ── */
.detail-text {
  font-size: 0.82rem;
  line-height: 1.75;
  color: #5D4E37;
}

.summary-line {
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
  border-left: 2px solid rgba(198,40,40,0.25);
}

.reading-line {
  margin-bottom: 0.3rem;
  font-size: 0.875rem;
  line-height: 1.75;
  color: #6B5B4F;
}

.combination-note {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.75;
  color: #C62828;
  opacity: 0.85;
}

.detail-empty-text {
  font-size: 0.78rem;
  color: #7A6A5C;
  opacity: 0.5;
  font-style: italic;
}
</style>
