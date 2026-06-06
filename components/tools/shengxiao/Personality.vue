<template>
  <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.35s' }">
    <div class="section-header">
      <h2>性格特征</h2>
    </div>

    <!-- ══ 纳音性格维度（同年肖区分） ══ -->
    <div v-if="nayinInfo" class="nayin-card mb-5">
      <div class="nayin-inner">
        <span class="nayin-seal" aria-hidden="true">音</span>
        <div class="nayin-body">
          <div class="nayin-headline">
            <span class="nayin-label"
              >{{ result.stemBranch }} · {{ result.animal }} · {{ nayinInfo.nayin }}</span
            >
          </div>
          <p class="nayin-core">
            <span class="nayin-core__label">纳音断性</span>
            <span class="nayin-core__text">「{{ nayinInfo.core }}」</span>
          </p>
          <p class="nayin-desc">{{ nayinInfo.description }}</p>
          <div class="nayin-tags">
            <span v-for="kw in nayinInfo.keywords" :key="kw" class="nayin-tag">{{ kw }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      <!-- Pros -->
      <div class="card-warm rounded-xl p-5">
        <h4 class="font-sans text-sm font-medium text-wuxing-wood mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">▸</span> 优点
        </h4>
        <ul class="space-y-1.5">
          <li
            v-for="pro in result.personalityPro"
            :key="pro"
            class="font-sans text-sm text-ink-medium flex items-start gap-2"
          >
            <span class="text-wuxing-wood mt-0.5 flex-shrink-0" aria-hidden="true">●</span>
            {{ pro }}
          </li>
        </ul>
      </div>
      <!-- Cons -->
      <div class="card-warm rounded-xl p-5">
        <h4 class="font-sans text-sm font-medium text-cinnabar mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">▸</span> 缺点
        </h4>
        <ul class="space-y-1.5">
          <li
            v-for="con in result.personalityCon"
            :key="con"
            class="font-sans text-sm text-ink-medium flex items-start gap-2"
          >
            <span class="text-cinnabar/70 mt-0.5 flex-shrink-0" aria-hidden="true">○</span>
            {{ con }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'
import { getNayinPersonality } from '~/constants/stem-animal'

const props = defineProps<{
  result: ShengXiaoResult
}>()

const nayinInfo = computed(() => getNayinPersonality(props.result.stemBranch))
</script>

<style scoped>
/* ══ 纳音性格维度 ══ */
.nayin-card {
  background: linear-gradient(135deg, var(--color-scroll-light) 0%, var(--color-scroll-dark) 100%);
  border-radius: 0.625rem;
  border: 1px solid rgba(44, 26, 14, 0.03);
  overflow: hidden;
}

.nayin-inner {
  display: flex;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
}

.nayin-seal {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-cinnabar, #c62828);
  color: #faf0e0;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  transform: rotate(-3deg);
  border-radius: 2px;
  margin-top: 0.125rem;
}

.nayin-body {
  min-width: 0;
  flex: 1;
}

.nayin-headline {
  margin-bottom: 0.375rem;
}

.nayin-label {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.82rem;
  color: var(--color-ink-dark, #2c1810);
  letter-spacing: 0.18em;
}

.nayin-core {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
}

.nayin-core__label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  letter-spacing: 0.08em;
  flex-shrink: 0;
}

.nayin-core__text {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 1.05rem;
  color: var(--color-ink-dark, #2c1810);
  letter-spacing: 0.12em;
  line-height: 1.4;
}

.nayin-desc {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium, #5a4a3a);
  line-height: 1.65;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
}

.nayin-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.nayin-tag {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-cinnabar, #c62828);
  padding: 0.08rem 0.5rem;
  border-radius: 999px;
  background: rgba(198, 40, 40, 0.04);
  border: 1px solid rgba(198, 40, 40, 0.08);
  letter-spacing: 0.06em;
}
</style>
