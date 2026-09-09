<script setup lang="ts">
import { ref, computed } from 'vue'
import { STEMS, BRANCHES, ANIMALS, BRANCH_TO_ANIMAL } from '~/constants/shengxiao-rules'
import { resolveSourceLink, resolveSourceTitle } from '~/constants/shengxiao-sources'

/**
 * 「认识十二生肖」公共文化浏览（契约 §10、§19.4）。
 *
 * - 不输入个人日期，只切换公共文化内容；
 * - 数据来自独立规则表（constants/shengxiao-rules.ts）与已批准来源
 *   （SRC-003 / SRC-003a / SRC-004）；
 * - 不生成代表年份、不调用领域日期计算（calculateShengXiao）；
 * - 不展示可选关系（R-SX-007）、人格、配对、运势或守护佛（BLK-005/006 未核验）。
 */
const selectedIndex = ref(0)

const CULTURE_SOURCES = ['SRC-003', 'SRC-003a', 'SRC-004']

const selected = computed(() => {
  const index = selectedIndex.value
  const branch = BRANCHES[index]
  const animal = BRANCH_TO_ANIMAL[branch]
  // 最近一轮示例干支：按地支找当前轮次（仅展示干支循环基础，不表示用户出生年）
  const stemIndex = index % 10
  const ganZhi = STEMS[stemIndex] + branch
  return { index, animal, branch, ganZhi }
})

function selectAnimal(index: number) {
  selectedIndex.value = index
}
</script>

<template>
  <section class="verified-culture" aria-labelledby="shengxiao-culture-heading">
    <h2 id="shengxiao-culture-heading" class="section-header font-display text-xl text-ink-dark">
      认识十二生肖
    </h2>
    <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
      十二生肖按固定次序与十二地支对应。这里只浏览公共文化内容，不代入你的出生日期，也不生成代表年份或个性结论。
    </p>

    <!-- 十二生肖切换（朱笔圈点激活态） -->
    <div class="culture-tabs mt-4 grid gap-2" role="tablist" aria-label="十二生肖">
      <button
        v-for="(animal, idx) in ANIMALS"
        :key="animal"
        type="button"
        :class="[
          'min-h-[44px] rounded-lg border-l-2 text-sm transition-colors',
          idx === selectedIndex
            ? 'border-l-cinnabar text-cinnabar font-medium'
            : 'border-l-transparent text-ink-medium hover:bg-paper-medium/50',
        ]"
        :aria-selected="idx === selectedIndex ? 'true' : 'false'"
        :aria-current="idx === selectedIndex ? 'true' : undefined"
        role="tab"
        @click="selectAnimal(idx)"
        @keydown.enter="selectAnimal(idx)"
        @keydown.space.prevent="selectAnimal(idx)"
      >
        {{ animal }}
      </button>
    </div>

    <!-- 当前生肖文化内容 -->
    <div class="mt-6 card-warm rounded-xl p-6 sm:p-8" role="tabpanel">
      <div class="flex flex-wrap items-center gap-4">
        <span class="seal-icon seal-icon--lg flex-shrink-0" aria-hidden="true">{{
          selected.animal
        }}</span>
        <div>
          <h3 class="font-display text-2xl text-ink-dark">{{ selected.animal }}</h3>
          <p class="font-sans text-sm text-ink-medium">
            对应地支：<span class="text-cinnabar">{{ selected.branch }}</span>
          </p>
        </div>
      </div>

      <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="verified-culture__cell">
          <dt>生肖次序</dt>
          <dd>第 {{ selected.index + 1 }} 位（十二生肖第 {{ selected.index + 1 }} 位）</dd>
        </div>
        <div class="verified-culture__cell">
          <dt>干支循环示例</dt>
          <dd>{{ selected.ganZhi }}（干支循环基础，不代表你的出生年）</dd>
        </div>
      </dl>

      <div class="mt-4">
        <h4 class="font-display text-base text-ink-dark">依据与来源</h4>
        <ul class="mt-2 space-y-2">
          <li v-for="sourceRef in CULTURE_SOURCES" :key="sourceRef" class="font-sans text-sm">
            <a
              :href="resolveSourceLink(sourceRef)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cinnabar underline break-words"
            >
              {{ resolveSourceTitle(sourceRef) }}
            </a>
            <span class="text-ink-light">（{{ sourceRef }}）</span>
          </li>
        </ul>
        <p class="mt-3 font-sans text-xs text-ink-medium leading-relaxed">
          生肖次序与地支对应来自已核验来源；扩展文化形象、地支关系等未核验内容不在此展示。
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 按钮至少保留触控宽度，文本放大后换行而不是挤压字形。 */
.culture-tabs {
  grid-template-columns: repeat(auto-fit, minmax(max(44px, 1.5em), 1fr));
}
.verified-culture__cell dt {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-light);
}
.verified-culture__cell dd {
  margin-top: 0.25rem;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--color-ink-dark);
  word-break: break-word;
}
</style>
