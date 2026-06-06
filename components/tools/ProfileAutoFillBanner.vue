<script setup lang="ts">
const props = defineProps<{
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
  <!-- Missing birth date banner -->
  <div v-if="props.missingBirth" class="auto-fill-banner auto-fill-banner--missing">
    <span class="banner-label">
      📝 命簿中尚未填写生日，
      <NuxtLink :to="'/profile/' + props.profileId" class="banner-link">前往设置</NuxtLink>
    </span>
  </div>

  <!-- Normal auto-fill banner -->
  <div v-else-if="!props.isFilled" class="auto-fill-banner">
    <span class="banner-label">
      从命簿「<strong>{{ props.profileName }}</strong
      >」填入生辰
    </span>
    <button class="banner-fill-btn" @click="emit('fill')">填入</button>
  </div>

  <div v-else class="auto-fill-banner auto-fill-banner--done">
    <span class="banner-label">
      <span class="banner-check">✓</span>
      已填入{{ props.profileName }}
      <span v-if="props.conversionNote" class="banner-note"> · {{ props.conversionNote }} </span>
    </span>
    <button class="banner-revoke-btn" @click="emit('revoke')">撤销</button>
  </div>
</template>

<style scoped>
.auto-fill-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  margin-bottom: 1rem;
  background: color-mix(in oklch, var(--color-paper-card, #e8dcc6) 80%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-ink, #2c1810) 10%, transparent);
  border-left: 3px solid color-mix(in oklch, var(--color-cinnabar, #c62828) 25%, transparent);
  border-radius: 0.125rem 0.25rem 0.25rem 0.125rem;
  font-size: 0.8125rem;
}

.auto-fill-banner--done {
  border-left-color: color-mix(in oklch, var(--color-jade, #3d6b4b) 30%, transparent);
}

.banner-label {
  color: color-mix(in oklch, var(--color-ink, #2c1810) 55%, transparent);
  line-height: 1.5;
}

.banner-label strong {
  color: var(--color-ink-dark, #1e1210);
  font-weight: 500;
}

.banner-check {
  color: var(--color-jade, #3d6b4b);
  font-weight: 700;
  margin-right: 0.125rem;
}

.banner-note {
  color: color-mix(in oklch, var(--color-ink, #2c1810) 40%, transparent);
  font-size: 0.75rem;
}

.banner-fill-btn {
  flex-shrink: 0;
  padding: 0.25rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #fff;
  background: var(--color-cinnabar, #c62828);
  border: none;
  border-radius: 0.1875rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.banner-fill-btn:hover {
  background: var(--color-cinnabar-deeper, #9c1a1c);
}

.banner-revoke-btn {
  flex-shrink: 0;
  padding: 0;
  font-size: 0.75rem;
  color: color-mix(in oklch, var(--color-cinnabar, #c62828) 50%, transparent);
  background: none;
  border: none;
  cursor: pointer;
}

.banner-revoke-btn:hover {
  color: var(--color-cinnabar, #c62828);
  text-decoration: underline;
}
.banner-link {
  color: var(--color-cinnabar, #c62828);
  text-decoration: underline;
  font-weight: 500;
}
.banner-link:hover {
  color: var(--color-cinnabar-deeper, #9c1a1c);
}
.auto-fill-banner--missing {
  border-left-color: var(--color-gold, #b8860b);
}
</style>
