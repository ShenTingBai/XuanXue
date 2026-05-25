<template>
  <div class="space-y-4">
    <div v-for="i in 4" :key="i" class="space-y-1">
      <div class="skeleton-block w-16 mb-1" />
      <div class="fortune-bar"><div class="skeleton-pulse h-full rounded-full" /></div>
    </div>
  </div>
</template>
