<template>
  <div class="mitigation-card mitigation-enter" :style="{ '--delay': delay }">
    <!-- ── Decorative top border ── -->
    <div class="mitigation-rule-top" aria-hidden="true" />

    <div class="mitigation-inner">
      <!-- ══ Header: 敕 + 化太岁 ══ -->
      <div class="mitigation-header">
        <div class="mitigation-seal" aria-hidden="true">敕</div>
        <h2 class="mitigation-title">化 太 岁</h2>
        <span class="mitigation-year-tag">{{ currentYear }}</span>
      </div>

      <!-- ══ 太岁文化背景 ══ -->
      <p class="mitigation-intro">
        太岁为道教值年神，六十甲子各有神君轮值，掌一年吉凶祸福。各人生肖地支与当年太岁地支相推，
        生克冲合各异——值、冲、刑、害、破为犯，三合、六合为和。犯太岁者宜谨慎行事以求趋吉避凶。
      </p>

      <!-- ══ 值年太岁 + 本命太岁 ══ -->
      <div class="deity-section">
        <div class="deity-card deity-card--current">
          <span class="deity-label">值年太岁</span>
          <span class="deity-ganzhi">{{ currentDeity.stemBranch }}</span>
          <span class="deity-name">{{ currentDeity.title }}</span>
          <p class="deity-bio">{{ currentDeity.description }}</p>
        </div>
        <div class="deity-connector" aria-hidden="true">
          <span class="deity-connector__dot" />
        </div>
        <div class="deity-card deity-card--birth">
          <span class="deity-label">本命太岁</span>
          <span class="deity-ganzhi">{{ birthDeity.stemBranch }}</span>
          <span class="deity-name">{{ birthDeity.title }}</span>
          <p class="deity-bio">{{ birthDeity.description }}</p>
        </div>
      </div>

      <!-- ══ 太岁关系 ══ -->
      <div class="relation-section">
        <div class="relation-badge" :class="'relation-badge--' + severityClass">
          {{ negative !== '平' ? negative : positive }}
        </div>
        <div class="relation-severity" :class="'relation-severity--' + severityClass">
          {{ guide.severity }}
        </div>
        <p class="relation-effect">{{ guide.effect }}</p>
      </div>

      <!-- ══ 化解方法 ══ -->
      <div v-if="guide.methodIndices.length > 0" class="methods-section">
        <h3 class="methods-heading">
          <span class="methods-heading__deco" aria-hidden="true">⚘</span>
          化 解 方 法
        </h3>
        <div class="methods-list">
          <div v-for="(idx, i) in guide.methodIndices" :key="idx" class="method-item">
            <span class="method-num">{{ i + 1 }}</span>
            <div class="method-content">
              <h4 class="method-title">{{ methods[idx].title }}</h4>
              <p class="method-summary">{{ methods[idx].summary }}</p>
              <p class="method-detail">{{ methods[idx].details }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ 禁忌 + 建议 ══ -->
      <div v-if="guide.taboos.length || guide.tips.length" class="advisory-section">
        <div v-if="guide.taboos.length" class="advisory-block advisory-block--taboo">
          <h4 class="advisory-heading advisory-heading--taboo">
            <span aria-hidden="true">☰</span> 忌
          </h4>
          <ul class="advisory-list">
            <li v-for="(t, i) in guide.taboos" :key="i" class="advisory-item advisory-item--taboo">
              {{ t }}
            </li>
          </ul>
        </div>
        <div v-if="guide.tips.length" class="advisory-block advisory-block--tip">
          <h4 class="advisory-heading advisory-heading--tip">
            <span aria-hidden="true">✦</span> 宜
          </h4>
          <ul class="advisory-list">
            <li v-for="(t, i) in guide.tips" :key="i" class="advisory-item advisory-item--tip">
              {{ t }}
            </li>
          </ul>
        </div>
      </div>

      <!-- ══ 化解口诀 ══ -->
      <div class="mantra-section">
        <div class="mantra-divider" aria-hidden="true">
          <span class="mantra-divider__diamond">◇</span>
        </div>
        <p class="mantra-text">{{ MITIGATION_MANTRA }}</p>
      </div>
    </div>

    <!-- ── Decorative bottom border ── -->
    <div class="mitigation-rule-btm" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { WUXING_COLORS } from '~/constants/bazi'
import {
  getBirthTaiSui,
  getYearTaiSui,
  MITIGATION_METHODS,
  MITIGATION_GUIDES,
  MITIGATION_MANTRA,
  type TaiSuiRelation,
  type MitigationGuide,
} from '~/constants/tai-sui'

const props = withDefaults(
  defineProps<{
    birthYear: number
    currentYear?: number
    relation: TaiSuiRelation
    positive?: string
    negative?: string
    delay?: string
  }>(),
  {
    currentYear: new Date().getFullYear(),
    positive: '平',
    negative: '平',
    delay: '0.4s',
  },
)

const currentDeity = computed(() => getYearTaiSui(props.currentYear))
const birthDeity = computed(() => getBirthTaiSui(props.birthYear))

const guide = computed<MitigationGuide>(() => {
  const key =
    props.negative !== '平'
      ? (props.negative as TaiSuiRelation)
      : (props.positive as TaiSuiRelation)
  return MITIGATION_GUIDES[key] || MITIGATION_GUIDES['平']
})

const methods = MITIGATION_METHODS

const severityClass = computed(() => {
  const sev = guide.value.severity
  if (sev === '最重' || sev === '较重') return 'severe'
  if (sev === '中等') return 'moderate'
  return 'mild'
})
</script>

<style scoped>
/* ════════════════════════════════════════
   化太岁 · 敕令灵符风格
   ════════════════════════════════════════ */

/* ── Card shell ── */
.mitigation-card {
  position: relative;
  background: linear-gradient(
    180deg,
    var(--color-scroll-light) 0%,
    var(--color-scroll) 40%,
    var(--color-scroll-dark) 100%
  );
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px rgba(198, 40, 40, 0.04),
    0 2px 12px rgba(44, 26, 14, 0.03);
}

.mitigation-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.2;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 24px,
    rgba(198, 40, 40, 0.02) 24px,
    rgba(198, 40, 40, 0.02) 25px
  );
  pointer-events: none;
}

.mitigation-inner {
  position: relative;
  z-index: 1;
  padding: 1.75rem 1.5rem;
}

@media (min-width: 640px) {
  .mitigation-inner {
    padding: 2rem 2rem;
  }
}

/* ── Top / Bottom decorative rules ── */
.mitigation-rule-top,
.mitigation-rule-btm {
  position: absolute;
  left: 10%;
  right: 10%;
  height: 3px;
  z-index: 2;
  pointer-events: none;
}
.mitigation-rule-top {
  top: -1px;
  background: repeating-linear-gradient(
    90deg,
    rgba(198, 40, 40, 0.13) 0px,
    rgba(198, 40, 40, 0.13) 6px,
    transparent 6px,
    transparent 12px
  );
}
.mitigation-rule-btm {
  bottom: -1px;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 6px,
    rgba(198, 40, 40, 0.09) 6px,
    rgba(198, 40, 40, 0.09) 12px
  );
}

/* ══ Header ══ */
.mitigation-intro {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  line-height: 1.7;
  letter-spacing: 0.03em;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 0.375rem;
  border-left: 2px solid rgba(198, 40, 40, 0.15);
}

.mitigation-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(198, 40, 40, 0.06);
}

.mitigation-seal {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-cinnabar, #c62828);
  color: #fdf6e3;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  transform: rotate(-3deg);
  border-radius: 3px;
  box-shadow: 1px 1px 0 rgba(44, 26, 14, 0.08);
}

.mitigation-title {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 1.125rem;
  color: var(--color-ink-dark, #2c1810);
  letter-spacing: 0.35em;
  font-weight: 400;
  line-height: 1.3;
  margin-right: auto;
}

.mitigation-year-tag {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  letter-spacing: 0.08em;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(44, 26, 14, 0.06);
  background: rgba(255, 255, 255, 0.4);
}

/* ══ Deity section ══ */
.deity-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

@media (min-width: 640px) {
  .deity-section {
    flex-direction: row;
    align-items: stretch;
    gap: 1rem;
  }
}

.deity-card {
  flex: 1;
  padding: 1rem 1.125rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(44, 26, 14, 0.04);
}

.deity-card--current {
  border-left: 3px solid var(--color-cinnabar, #c62828);
}

.deity-card--birth {
  border-left: 3px solid rgba(61, 107, 75, 0.4);
}

.deity-label {
  display: inline-block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.12em;
  margin-bottom: 0.375rem;
}

.deity-ganzhi {
  display: block;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.78rem;
  color: var(--color-ink-medium, #5a4a3a);
  letter-spacing: 0.2em;
  margin-bottom: 0.125rem;
}

.deity-name {
  display: block;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 1.125rem;
  color: var(--color-ink-dark, #2c1810);
  letter-spacing: 0.15em;
  line-height: 1.3;
  margin-bottom: 0.375rem;
}

.deity-bio {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  color: var(--color-ink-medium, #5a4a3a);
  line-height: 1.6;
  letter-spacing: 0.03em;
}

.deity-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .deity-connector {
    width: 1.5rem;
    flex-direction: column;
  }
}

.deity-connector__dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: rgba(198, 40, 40, 0.15);
}

@media (min-width: 640px) {
  .deity-connector::before,
  .deity-connector::after {
    content: '';
    flex: 1;
    width: 1px;
    background: repeating-linear-gradient(
      180deg,
      rgba(44, 26, 14, 0.06) 0px,
      rgba(44, 26, 14, 0.06) 2px,
      transparent 2px,
      transparent 4px
    );
  }
}

/* ══ Relation section ══ */
.relation-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 1rem 1.125rem;
  margin-bottom: 1.25rem;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 0.5rem;
  border: 1px solid rgba(44, 26, 14, 0.04);
}

.relation-badge {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.85rem;
  padding: 0.2rem 0.75rem;
  border-radius: 3px;
  letter-spacing: 0.12em;
  line-height: 1.4;
  white-space: nowrap;
}

.relation-badge--severe {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["火"]');
  border: 1px solid color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 15%, transparent);
}

.relation-badge--moderate {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 5%, transparent);
  color: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 65%, transparent);
  border: 1px solid color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 10%, transparent);
}

.relation-badge--mild {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 6%, transparent);
  color: v-bind('WUXING_COLORS["木"]');
  border: 1px solid color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 12%, transparent);
}

.relation-severity {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
}

.relation-severity--severe {
  color: v-bind('WUXING_COLORS["火"]');
  border: 1px solid color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 12%, transparent);
}

.relation-severity--moderate {
  color: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 60%, transparent);
  border: 1px solid color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 8%, transparent);
}

.relation-severity--mild {
  color: v-bind('WUXING_COLORS["木"]');
  border: 1px solid color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 10%, transparent);
}

.relation-effect {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  color: var(--color-ink-medium, #5a4a3a);
  line-height: 1.7;
  letter-spacing: 0.03em;
  margin-top: 0.25rem;
}

/* ══ Methods section ══ */
.methods-section {
  margin-bottom: 1.25rem;
}

.methods-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.9rem;
  color: var(--color-ink-dark, #2c1810);
  letter-spacing: 0.3em;
  font-weight: 400;
  margin-bottom: 0.875rem;
}

.methods-heading__deco {
  opacity: 0.25;
  font-size: 0.65rem;
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.method-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(44, 26, 14, 0.03);
  transition: background 0.2s ease;
}

.method-item:hover {
  background: rgba(255, 255, 255, 0.65);
}

.method-num {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(198, 40, 40, 0.06);
  color: var(--color-cinnabar, #c62828);
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.6875rem;
  margin-top: 0.05rem;
}

.method-content {
  min-width: 0;
}

.method-title {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.85rem;
  color: var(--color-ink-dark, #2c1810);
  letter-spacing: 0.15em;
  font-weight: 400;
  line-height: 1.4;
  margin-bottom: 0.125rem;
}

.method-summary {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: var(--color-ink-medium, #5a4a3a);
  line-height: 1.5;
  letter-spacing: 0.03em;
  margin-bottom: 0.2rem;
}

.method-detail {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.7rem;
  color: var(--color-ink-medium, #5a4a3a);
  line-height: 1.6;
  letter-spacing: 0.02em;
}

/* ══ Advisory section ══ */
.advisory-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .advisory-section {
    flex-direction: row;
  }
}

.advisory-block {
  flex: 1;
  padding: 0.875rem 1rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.4);
}

.advisory-block--taboo {
  border: 1px solid rgba(198, 40, 40, 0.04);
}

.advisory-block--tip {
  border: 1px solid rgba(61, 107, 75, 0.04);
}

.advisory-heading {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  font-weight: 400;
  margin-bottom: 0.5rem;
}

.advisory-heading--taboo {
  color: var(--color-cinnabar, #c62828);
  opacity: 0.7;
}

.advisory-heading--tip {
  color: v-bind('WUXING_COLORS["木"]');
  opacity: 0.7;
}

.advisory-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.advisory-item {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  line-height: 1.6;
  letter-spacing: 0.03em;
  padding: 0.15rem 0;
  color: var(--color-ink-medium, #5a4a3a);
}

.advisory-item::before {
  content: '· ';
  opacity: 0.3;
}

/* ══ Mantra ══ */
.mantra-section {
  text-align: center;
  padding: 0.75rem 0 0;
}

.mantra-divider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.mantra-divider::before,
.mantra-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(198, 40, 40, 0.06) 30%, transparent);
}

.mantra-divider__diamond {
  color: rgba(198, 40, 40, 0.15);
  font-size: 0.5rem;
}

.mantra-text {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.85rem;
  color: var(--color-ink-medium, #5a4a3a);
  letter-spacing: 0.15em;
  line-height: 1.8;
}

/* ══ Animation ══ */
.mitigation-enter {
  animation: mitigationAppear 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes mitigationAppear {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
