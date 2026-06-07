<script setup lang="ts">
defineProps<{
  profileName: string
  isFilled: boolean
  conversionNote?: string
  missingBirth?: boolean
  profileId?: number
}>()

const emit = defineEmits<{
  fill: []
  revoke: []
}>()
</script>

<template>
  <!-- State 1: missingBirth -- 朱砂预警 -->
  <div v-if="missingBirth" class="card-warm rounded-xl p-5 mb-4 relative overflow-hidden">
    <div class="banner-bar banner-bar--cinnabar" />
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0 text-left">
        <h3 class="font-display text-xl text-ink-dark">命簿未载生辰</h3>
        <p class="font-sans text-sm text-ink-medium mt-1">前往「编辑档案」补全出生信息，方可排盘</p>
      </div>
      <NuxtLink :to="'/profile/' + profileId" class="btn-seal shrink-0">
        <span>编辑档案</span>
      </NuxtLink>
    </div>
  </div>

  <!-- State 2: !isFilled -- 墨香待填 -->
  <div v-else-if="!isFilled" class="card-warm rounded-xl p-5 mb-4 relative overflow-hidden">
    <div class="banner-bar banner-bar--ink" />
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0 text-left">
        <h3 class="font-display text-xl text-ink-dark">从命簿「{{ profileName }}」填入生辰</h3>
        <p class="font-sans text-sm text-ink-medium mt-1">生辰将自动填充到当前工具</p>
      </div>
      <button class="btn-seal shrink-0" @click="emit('fill')">
        <span>填入</span>
      </button>
    </div>
  </div>

  <!-- State 3: isFilled -- 玉印已落 -->
  <div v-else class="card-warm rounded-xl p-5 mb-4 relative overflow-hidden">
    <div class="banner-bar banner-bar--jade" />
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <span class="check-mark" />
        <span class="font-sans text-sm text-ink-medium"> 已填入「{{ profileName }}」 </span>
        <span v-if="conversionNote" class="text-ink-light text-xs"> · {{ conversionNote }} </span>
      </div>
      <button class="btn-ghost shrink-0" @click="emit('revoke')">撤销</button>
    </div>
  </div>
</template>

<style scoped>
/* ── 竖线 ── */
.banner-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 0.75rem 0 0 0.75rem;
  pointer-events: none;
}

.banner-bar--cinnabar {
  background: var(--color-cinnabar);
}

.banner-bar--ink {
  background: color-mix(in srgb, var(--color-ink) 20%, transparent);
}

.banner-bar--jade {
  background: var(--color-jade);
}

/* ── 朱砂圆形勾号（纯 CSS） ── */
.check-mark {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.check-mark::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--color-cinnabar);
}

.check-mark::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 7px;
  width: 5px;
  height: 9px;
  border: solid var(--color-paper-lightest);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>
