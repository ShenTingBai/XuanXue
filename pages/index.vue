<script setup lang="ts">
useHead({ title: '首页 - 玄学' })

const { restoreSession, currentProfile } = useAuth()
const greeting = useGreeting()
const router = useRouter()

interface Tool {
  id: string
  name: string
  char: string
  description: string
  route: string
  available: boolean
  accent?: string
}

const tools: Tool[] = [
  { id: 'shengxiao', name: '生肖', char: '兽', description: '生肖排盘 · 五行性格 · 生肖配对', route: '/tools/shengxiao', available: true, accent: '#3D6B4B' },
  { id: 'constellation', name: '星座', char: '辰', description: '十二星座 · 性格特征 · 今日运势', route: '/tools/constellation', available: true, accent: '#7A5E12' },
  { id: 'bazi', name: '八字', char: '命', description: '四柱排盘 · 十神定位 · 五行生克', route: '/tools/bazi', available: true, accent: '#C62828' },
  { id: 'yijing', name: '六爻', char: '卦', description: '数字起卦 · 卦象解读 · 吉凶判断', route: '/tools/yijing', available: true, accent: '#2C5F7C' },
  { id: 'ziwei', name: '紫微斗数', char: '斗', description: '十二宫排盘 · 星曜分析 · 命盘解读', route: '/tools/ziwei', available: false, accent: '#6B5B4F' },
]

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
  }
})
</script>

<template>
  <div class="min-h-screen relative">
    <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
      <template v-if="currentProfile">
        <!-- Greeting: scholarly scroll header -->
        <div class="mb-12 sm:mb-16 fade-in" :style="{ '--delay': '0.02s' }">
          <div class="flex flex-col items-start gap-3">
            <!-- Name line with decorative ink accent -->
            <div class="flex items-center gap-4">
              <span class="hidden sm:block w-6 h-px bg-gradient-to-r from-cinnabar/40 to-transparent" aria-hidden="true"></span>
              <h1 class="font-display text-4xl sm:text-5xl text-ink-dark leading-tight tracking-wide">
                {{ greeting.prefix }}，<span class="text-cinnabar">{{ currentProfile.nickname }}</span>
              </h1>
            </div>

            <!-- Subtitle with seal mark -->
            <div class="flex items-center gap-3 ml-0 sm:ml-10">
              <span class="seal-mark w-7 h-7 text-[9px]">玄</span>
              <p class="font-sans text-sm sm:text-base text-ink-light tracking-wider leading-relaxed">
                {{ greeting.subtitle }}
              </p>
            </div>
          </div>

          <!-- Decorative ink-wash divider -->
          <div class="mt-6 sm:mt-8 relative" aria-hidden="true">
            <div class="w-24 h-px bg-gradient-to-r from-cinnabar/30 via-paper-dark to-transparent"></div>
            <div class="w-16 h-px bg-gradient-to-r from-cinnabar/15 to-transparent mt-0.5"></div>
          </div>
        </div>

        <!-- Tool Grid -->
        <h2 class="sr-only">命理工具</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <div
            v-for="(tool, index) in tools"
            :key="tool.id"
            :tabindex="tool.available ? 0 : -1"
            :role="tool.available ? 'button' : undefined"
            :aria-label="tool.available ? ('打开' + tool.name + '工具') : (tool.name + '（即将上线）')"
            :aria-disabled="!tool.available || undefined"
            @click="tool.available && router.push(tool.route)"
            @keydown.enter="tool.available && router.push(tool.route)"
            @keydown.space.prevent="tool.available && router.push(tool.route)"
            :class="[
              'tool-card-alt rounded-xl p-6 sm:p-7',
              'fade-in',
              tool.available ? 'tool-card-alt--active' : 'tool-card-alt--locked'
            ]"
            :style="{ '--delay': `${(index + 1) * 0.12}s`, '--accent': tool.accent || '#C62828'  }"
          >
            <!-- Decorative top accent bar -->
            <div class="card-accent" aria-hidden="true"></div>

            <div class="flex items-start gap-4">
              <!-- Character icon — larger seal-style badge -->
              <span
                class="card-icon"
                :class="tool.available ? 'card-icon--active' : 'card-icon--locked'"
              >
                {{ tool.char }}
              </span>

              <!-- Content -->
              <div class="min-w-0 flex-1">
                <!-- Name -->
                <div class="flex items-center gap-2 mb-1.5">
                  <h3 class="font-display text-xl sm:text-2xl text-ink-dark leading-tight">{{ tool.name }}</h3>
                  <span
                    v-if="!tool.available"
                    class="px-2 py-0.5 rounded text-[0.6rem] tracking-wider font-sans text-ink-muted border border-paper-dark bg-paper-medium/50"
                  >
                    即将上线
                  </span>
                </div>

                <!-- Description -->
                <p class="font-sans text-sm text-ink-medium/80 leading-relaxed">
                  {{ tool.description }}
                </p>
              </div>
            </div>

            <!-- Available hint: subtle "进入" arrow -->
            <div v-if="tool.available" class="card-enter-hint" aria-hidden="true">
              <span class="enter-arrow">&rarr;</span>
            </div>

            <!-- Locked overlay stamp -->
            <div v-if="!tool.available" class="locked-stamp" aria-hidden="true">
              <span>封</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ── Tool card ── */
.tool-card-alt {
  position: relative;
  background: rgba(251, 248, 244, 0.95);
  border: 1px solid #E0D5C0;
  box-shadow: 0 2px 12px rgba(44, 24, 16, 0.06);
  cursor: default;
  overflow: hidden;
  transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease;
}

.tool-card-alt--active {
  cursor: pointer;
}

.tool-card-alt--active:hover {
  border-color: var(--accent, #C62828);
  box-shadow: 0 8px 32px rgba(44, 24, 16, 0.1);
  transform: translateY(-3px);
}

.tool-card-alt--active:focus-visible {
  outline: 2px solid var(--accent, #C62828);
  outline-offset: 2px;
  border-color: var(--accent, #C62828);
}

.tool-card-alt--active:active {
  transform: scale(0.98);
}

.tool-card-alt--locked {
  opacity: 0.6;
}

/* ── Top accent bar ── */
.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent, #C62828);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tool-card-alt--active:hover .card-accent {
  opacity: 1;
}

.tool-card-alt--locked .card-accent {
  background: #D4C5B0;
  opacity: 0.4;
}

/* ── Icon badge ── */
.card-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 1.35rem;
  transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s ease;
}

.card-icon--active {
  background: rgba(198, 40, 40, 0.06);
  border: 1px solid rgba(198, 40, 40, 0.2);
  color: #C62828;
}

.tool-card-alt--active:hover .card-icon--active {
  background: color-mix(in srgb, var(--accent, #C62828) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent, #C62828) 35%, transparent);
  color: var(--accent, #C62828);
  transform: scale(1.05);
}

.card-icon--locked {
  background: rgba(214, 197, 176, 0.3);
  border: 1px solid #D4C5B0;
  color: #7A6A5C;
}

/* ── Enter hint ── */
.card-enter-hint {
  position: absolute;
  bottom: 12px;
  right: 14px;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.tool-card-alt--active:hover .card-enter-hint {
  opacity: 1;
}

.enter-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--accent, #C62828);
  color: var(--accent, #C62828);
  font-size: 0.75rem;
  font-family: 'Noto Sans SC', sans-serif;
  transition: transform 0.3s ease;
}

.tool-card-alt--active:hover .enter-arrow {
  transform: translateX(2px);
}

/* ── Locked stamp ── */
.locked-stamp {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%) rotate(-15deg);
  width: 40px;
  height: 40px;
  border: 2px solid rgba(107, 91, 79, 0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 1.1rem;
  color: rgba(107, 91, 79, 0.3);
  pointer-events: none;
  user-select: none;
}

/* ── Responsive ── */
@media (min-width: 640px) {
  .card-icon {
    width: 56px;
    height: 56px;
    font-size: 1.5rem;
  }
}

/* Browsers without color-mix support: fallback to cinnabar hover */
@supports not (color: color-mix(in srgb, red, transparent)) {
  .tool-card-alt--active:hover .card-icon--active {
    background: rgba(198, 40, 40, 0.1);
    border-color: rgba(198, 40, 40, 0.35);
    color: #C62828;
  }
}
</style>
