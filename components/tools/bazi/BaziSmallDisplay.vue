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
      <span class="text-[0.5rem] text-ink-light">喜：</span>
      <span v-for="el in result.favorableElements" :key="el" class="bazi-compact__favorable">{{ el }}</span>
      <span class="text-[0.5rem] text-ink-light ml-1">忌：</span>
      <span v-for="el in result.unfavorableElements" :key="el" class="bazi-compact__unfavorable">{{ el }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  font-family: 'Noto Sans SC', sans-serif;
}

.bazi-compact__row {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0;
  border-bottom: 1px solid rgba(44, 26, 14, 0.03);
}

.bazi-compact__row--day {
  background: rgba(198, 40, 40, 0.04);
  border-radius: 2px;
  padding: 0.2rem 0.15rem;
}

.bazi-compact__label {
  width: 1.2rem;
  font-size: 0.5rem;
  color: var(--color-ink-light, #8A7A6A);
  text-align: center;
  flex-shrink: 0;
}

.bazi-compact__stem {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.9rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.1em;
  min-width: 1.2rem;
  text-align: center;
}

.bazi-compact__branch {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.9rem;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.1em;
  min-width: 1.2rem;
  text-align: center;
}

.bazi-compact__wuxing {
  display: flex;
  gap: 0.2rem;
  flex-wrap: wrap;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(44, 26, 14, 0.03);
}

.bazi-compact__wx-item {
  font-size: 0.5rem;
  padding: 0.05rem 0.25rem;
  border-radius: 2px;
}

.wx-木 { background: rgba(61, 107, 75, 0.08); color: #3D6B4B; }
.wx-火 { background: rgba(198, 40, 40, 0.08); color: #C62828; }
.wx-土 { background: rgba(122, 94, 18, 0.08); color: #7A5E12; }
.wx-金 { background: rgba(94, 94, 94, 0.08); color: #5E5E5E; }
.wx-水 { background: rgba(44, 95, 124, 0.08); color: #2C5F7C; }

.bazi-compact__extra {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding: 0.1rem 0;
}

.bazi-compact__daymaster {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.65rem;
  color: var(--color-cinnabar, #C62828);
}

.bazi-compact__strength {
  font-size: 0.5rem;
  color: var(--color-ink-light, #8A7A6A);
}

.bazi-compact__favorable {
  font-size: 0.5rem;
  color: #3D6B4B;
}

.bazi-compact__unfavorable {
  font-size: 0.5rem;
  color: #C62828;
}
</style>
