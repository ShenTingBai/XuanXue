<script setup lang="ts">
const props = defineProps<{
  profileName: string
  isFilled: boolean
  conversionNote?: string
}>()

const emit = defineEmits<{
  fill: []
  revoke: []
}>()
</script>

<template>
  <Transition name="fade">
    <div v-if="!props.isFilled" class="card-warm p-3 mb-4 flex items-center justify-between text-sm">
      <span class="text-ink/60">
        📂 从「<span class="text-ink/80 font-medium">{{ props.profileName }}</span>」的命簿填入生日
      </span>
      <button
        class="text-cinnabar hover:underline cursor-pointer transition-colors shrink-0 ml-3"
        @click="emit('fill')"
      >
        填入
      </button>
    </div>

    <div v-else class="card-warm p-3 mb-4 flex items-center justify-between text-sm">
      <span class="text-ink/60">
        ✓ 已从命簿填入
        <span v-if="props.conversionNote" class="text-ink/50">
          （{{ props.conversionNote }}）
        </span>
      </span>
      <button
        class="text-cinnabar/60 hover:text-cinnabar hover:underline cursor-pointer transition-colors shrink-0 ml-3"
        @click="emit('revoke')"
      >
        撤销
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
