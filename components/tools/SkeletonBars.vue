<template>
  <div class="space-y-4">
    <div v-for="i in 4" :key="i" class="space-y-1">
      <div class="skeleton-block w-16 mb-1"></div>
      <div class="fortune-bar">
        <div class="skeleton-pulse h-full rounded-full" style="width: 60%"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// SkeletonBars — loading placeholder for fortune bar sections
</script>
