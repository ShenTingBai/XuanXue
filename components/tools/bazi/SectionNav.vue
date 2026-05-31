<template>
  <nav
    class="mb-6 flex overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-hide gap-1.5 justify-start sm:flex-wrap sm:justify-center"
    aria-label="结果区块导航"
  >
    <a
      v-for="item in anchors"
      :key="item.anchor"
      :href="`#${sectionMap[item.anchor]}`"
      :class="[
        'px-3 py-2.5 text-xs rounded-full font-sans border transition-colors no-underline focus-visible:ring-2 focus-visible:ring-cinnabar focus-visible:ring-offset-2 flex-shrink-0',
        activeNavSection === item.anchor
          ? 'bg-cinnabar text-paper-lightest border-cinnabar'
          : 'border-paper-dark/40 text-ink-medium hover:text-cinnabar hover:border-cinnabar/30'
      ]"
      :aria-current="activeNavSection === item.anchor ? 'true' : undefined"
      @click.prevent="navigateToSection(item.anchor)"
    ><span>{{ item.label }}</span><span class="opacity-75 ml-0.5">({{ item.subtitle }})</span></a>
  </nav>
</template>

<script setup lang="ts">
import { sectionMap } from '~/constants/bazi'

const props = defineProps<{
  activeNavSection: string
  onBeforeNavigate?: (anchorName: string) => Promise<void> | void
}>()

const emit = defineEmits<{
  navigate: [sectionName: string]
}>()

const anchors = [
  { anchor: '排盘', label: '排盘', subtitle: '命盘' },
  { anchor: '神煞', label: '神煞', subtitle: '吉凶' },
  { anchor: '日主', label: '日主', subtitle: '元神' },
  { anchor: '五行', label: '五行', subtitle: '强弱' },
  { anchor: '大运', label: '大运', subtitle: '十年' },
  { anchor: '流年', label: '流年', subtitle: '岁运' },
  { anchor: '解读', label: '解读', subtitle: '速览' },
]

async function navigateToSection(anchorName: string) {
  const id = sectionMap[anchorName]
  if (!id) return

  // Allow parent to prepare (e.g. expand a collapsed section) before scrolling
  if (props.onBeforeNavigate) {
    await props.onBeforeNavigate(anchorName)
  }

  const el = document.getElementById(id)
  if (el) {
    const prefersReducedMotion = import.meta.client ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
    if (prefersReducedMotion) {
      el.scrollIntoView()
    } else {
      el.scrollIntoView({ behavior: 'smooth' })
    }
    el.focus({ preventScroll: true })
  }
  emit('navigate', anchorName)
}
</script>
