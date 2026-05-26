<template>
  <nav
    class="mb-6 flex flex-wrap gap-1.5 justify-center"
    aria-label="结果区块导航"
  >
    <a
      v-for="anchor in anchors"
      :key="anchor"
      :href="`#${sectionMap[anchor]}`"
      :class="[
        'px-3 py-2.5 text-xs rounded-full font-sans border transition-colors no-underline',
        activeNavSection === anchor
          ? 'bg-cinnabar text-paper-lightest border-cinnabar'
          : 'border-paper-dark/40 text-ink-medium hover:text-cinnabar hover:border-cinnabar/30'
      ]"
      @click.prevent="navigateToSection(anchor)"
    >{{ anchor }}</a>
  </nav>
</template>

<script setup lang="ts">
import { sectionMap } from '~/constants/bazi'

const props = defineProps<{
  activeNavSection: string
}>()

const emit = defineEmits<{
  navigate: [sectionName: string]
}>()

const anchors = ['排盘', '神煞', '日主', '五行', '大运', '流年', '解读']

function navigateToSection(anchorName: string) {
  const id = sectionMap[anchorName]
  if (!id) return
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
