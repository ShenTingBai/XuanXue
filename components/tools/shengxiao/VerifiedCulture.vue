<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
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
 *
 * 键盘模型（WAI-ARIA tabs 自动激活）：
 * - roving tabindex：选中项 tabindex=0，其余=-1，Tab 键在 tablist 上只停一次；
 * - ArrowRight/ArrowDown 选中下一项、ArrowLeft/ArrowUp 选中上一项，首尾循环；
 * - Home 选中第一项，End 选中最后一项；
 * - 键盘切换后把焦点移到新选中的 tab，使焦点与 aria-selected 始终一致。
 */
const selectedIndex = ref(0)

/** 详细来源台账默认收起；生肖次序与地支对应等核心事实始终直接可见。 */
const sourcesExpanded = ref(false)

/** 12 个 tab 的按钮引用，用于键盘切换后转移焦点。 */
const tabRefs = ref<HTMLButtonElement[]>([])

const CULTURE_SOURCES = ['SRC-003', 'SRC-003a', 'SRC-004']

/** tab 与 tabpanel 的稳定关联 id（同一组件实例内唯一）。 */
const TAB_ID_PREFIX = 'shengxiao-culture-tab'
const PANEL_ID = 'shengxiao-culture-panel'

function tabId(index: number): string {
  return `${TAB_ID_PREFIX}-${index}`
}

const selected = computed(() => {
  const index = selectedIndex.value
  const branch = BRANCHES[index]
  const animal = BRANCH_TO_ANIMAL[branch]
  // 最近一轮示例干支：按地支找当前轮次（仅展示干支循环基础，不表示用户出生年）
  const stemIndex = index % 10
  const ganZhi = STEMS[stemIndex] + branch
  return { index, animal, branch, ganZhi }
})

/** 鼠标/键盘选中同一入口：只改选中态，不触碰公共文化内容以外的任何状态。 */
function selectAnimal(index: number) {
  selectedIndex.value = index
}

/** 首尾循环取模，负数也回绕到末项。 */
function wrapIndex(index: number): number {
  const count = ANIMALS.length
  return ((index % count) + count) % count
}

/** 键盘选中并转移焦点：nextTick 等待 aria/tabindex 更新后再聚焦新按钮。 */
function selectAndFocus(index: number) {
  selectAnimal(wrapIndex(index))
  void nextTick(() => {
    tabRefs.value[selectedIndex.value]?.focus()
  })
}

function handleKeydown(event: KeyboardEvent, index: number) {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      selectAndFocus(index + 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      selectAndFocus(index - 1)
      break
    case 'Home':
      event.preventDefault()
      selectAndFocus(0)
      break
    case 'End':
      event.preventDefault()
      selectAndFocus(ANIMALS.length - 1)
      break
    default:
      break
  }
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
        :ref="el => (tabRefs[idx] = el as HTMLButtonElement)"
        :id="tabId(idx)"
        type="button"
        :class="[
          'min-h-[44px] rounded-lg border-l-2 text-sm transition-colors',
          idx === selectedIndex
            ? 'border-l-cinnabar text-cinnabar font-medium'
            : 'border-l-transparent text-ink-medium hover:bg-paper-medium/50',
        ]"
        :aria-selected="idx === selectedIndex ? 'true' : 'false'"
        :aria-current="idx === selectedIndex ? 'true' : undefined"
        :tabindex="idx === selectedIndex ? 0 : -1"
        :aria-controls="PANEL_ID"
        role="tab"
        @click="selectAnimal(idx)"
        @keydown="handleKeydown($event, idx)"
        @keydown.enter="selectAnimal(idx)"
        @keydown.space.prevent="selectAnimal(idx)"
      >
        {{ animal }}
      </button>
    </div>

    <!-- 当前生肖文化内容 -->
    <!-- 面板内含来源链接（可聚焦），按 WAI-ARIA tabs 模式不再给面板加 tabindex，
         避免多出一个冗余 Tab 停留点。 -->
    <div
      :id="PANEL_ID"
      class="mt-6 card-warm rounded-xl p-6 sm:p-8"
      role="tabpanel"
      :aria-labelledby="tabId(selectedIndex)"
    >
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
        <!-- 依据与来源：详细台账默认收起，核心事实（生肖次序、地支对应）在上方直接可见。
             折叠只影响详细程度，不影响「结果是否适用」的判断。 -->
        <button
          :aria-expanded="sourcesExpanded"
          aria-controls="culture-sources-panel"
          class="marginal-toggle"
          @click="sourcesExpanded = !sourcesExpanded"
          @keydown.enter="sourcesExpanded = !sourcesExpanded"
          @keydown.space.prevent="sourcesExpanded = !sourcesExpanded"
        >
          <span class="marginal-toggle__rule" aria-hidden="true" />
          <span>{{ sourcesExpanded ? '收起' : '展开' }}依据与来源</span>
          <span class="marginal-toggle__arrow" aria-hidden="true">▼</span>
        </button>
        <Transition name="expand">
          <div v-if="sourcesExpanded" id="culture-sources-panel">
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
          </div>
        </Transition>
        <!-- 文化边界：关键限制始终直接可见，不随来源台账折叠。 -->
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
/* 折叠过渡：与设计系统 §4.1 标准模式一致。 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 2000px;
  opacity: 1;
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
