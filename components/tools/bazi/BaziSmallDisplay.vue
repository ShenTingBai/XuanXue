<template>
  <div class="bazi-compact" aria-label="八字简表">
    <div class="bazi-compact__row">
      <span class="bazi-compact__label">年</span>
      <span class="bazi-compact__stem">{{ result.yearPillar.stem }}</span>
      <span class="bazi-compact__branch">{{ result.yearPillar.branch }}</span>
    </div>
    <div class="bazi-compact__row">
      <span class="bazi-compact__label">月</span>
      <span class="bazi-compact__stem">{{ result.monthPillar.stem }}</span>
      <span class="bazi-compact__branch">{{ result.monthPillar.branch }}</span>
    </div>
    <div class="bazi-compact__row bazi-compact__row--day">
      <span class="bazi-compact__label">日</span>
      <span class="bazi-compact__stem">{{ result.dayPillar.stem }}</span>
      <span class="bazi-compact__branch">{{ result.dayPillar.branch }}</span>
    </div>
    <div v-if="result.hourPillar" class="bazi-compact__row">
      <span class="bazi-compact__label">时</span>
      <span class="bazi-compact__stem">{{ result.hourPillar.stem }}</span>
      <span class="bazi-compact__branch">{{ result.hourPillar.branch }}</span>
    </div>
    <!-- 五行 -->
    <div class="bazi-compact__wuxing">
      <span
        v-for="(val, el) in result.elementCounts"
        :key="el"
        class="bazi-compact__wx-item"
        :class="`wx-${el}`"
      >
        {{ el }}{{ val }}
      </span>
    </div>
    <!-- 日主强弱 -->
    <div class="bazi-compact__extra">
      <span class="bazi-compact__daymaster">{{ result.dayMaster }}日主</span>
      <span class="bazi-compact__strength">{{ result.dayMasterStrength }}</span>
    </div>
    <!-- 用神 -->
    <div class="bazi-compact__extra">
      <span class="text-[0.6875rem] text-ink-muted">喜：</span>
      <span v-for="el in result.favorableElements" :key="el" class="bazi-compact__favorable">{{
        el
      }}</span>
      <span class="text-[0.6875rem] text-ink-muted ml-1">忌：</span>
      <span v-for="el in result.unfavorableElements" :key="el" class="bazi-compact__unfavorable">{{
        el
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WUXING_COLORS } from '~/constants/bazi'
import type { BaZiResult } from '~/composables/useBaZi'

defineProps<{
  result: BaZiResult
}>()
</script>

<style scoped>
.bazi-compact {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-family: var(--font-sans);
}

.bazi-compact__row {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink-darkest) 3%, transparent);
}

.bazi-compact__row--day {
  background: color-mix(in srgb, var(--color-cinnabar) 4%, transparent);
  border-radius: 2px;
  padding: 0.2rem 0.15rem;
}

.bazi-compact__label {
  width: 1.4rem;
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
  text-align: center;
  flex-shrink: 0;
}

.bazi-compact__stem {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.9rem;
  color: var(--color-ink-dark);
  letter-spacing: 0.1em;
  min-width: 1.2rem;
  text-align: center;
}

.bazi-compact__branch {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.9rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.1em;
  min-width: 1.2rem;
  text-align: center;
}

.bazi-compact__wuxing {
  display: flex;
  gap: 0.2rem;
  flex-wrap: wrap;
  padding: 0.2rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink-darkest) 3%, transparent);
}

.bazi-compact__wx-item {
  font-size: 0.6875rem;
  padding: 0.05rem 0.25rem;
  border-radius: 2px;
}

.wx-木 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["木"]');
}
.wx-火 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["火"]');
}
.wx-土 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["土"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["土"]');
}
.wx-金 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["金"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["金"]');
}
.wx-水 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["水"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["水"]');
}

.bazi-compact__extra {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding: 0.1rem 0;
}

.bazi-compact__daymaster {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.6875rem;
  color: var(--color-cinnabar);
}

.bazi-compact__strength {
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
}

.bazi-compact__favorable {
  font-size: 0.6875rem;
  color: v-bind('WUXING_COLORS["木"]');
}

.bazi-compact__unfavorable {
  font-size: 0.6875rem;
  color: v-bind('WUXING_COLORS["火"]');
}
</style>
