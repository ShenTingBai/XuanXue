<script setup lang="ts">
useHead({ title: '玄 · 道 — 玄天机 · 道命理' })

const { restoreSession, currentProfile } = useAuth()
const greeting = useGreeting()
const router = useRouter()

interface Tool {
  id: string
  name: string
  char: string
  description: string
  landingDescription: string
  route: string
  available: boolean
  accent?: string
  trigram?: string
}

const tools: Tool[] = [
  {
    id: 'bazi', name: '八字', char: '命',
    description: '了解你的先天命格、性格特质和人生大运',
    landingDescription: '四柱推命 · 十神大运 · 流年神煞',
    route: '/tools/bazi', available: true, accent: '#C62828', trigram: '☰',
  },
  {
    id: 'yijing', name: '六爻', char: '卦',
    description: '针对具体问题（事业、感情、决策）获得卦象指引',
    landingDescription: '摇卦起数 · 爻辞解读 · 变卦推断',
    route: '/tools/yijing', available: true, accent: '#2C5F7C', trigram: '☵',
  },
  {
    id: 'shengxiao', name: '生肖', char: '肖',
    description: '查看你的生肖性格、幸运元素和年度运势',
    landingDescription: '生肖运势 · 五行属性 · 相性配对',
    route: '/tools/shengxiao', available: true, accent: '#3D6B4B', trigram: '☷',
  },
  {
    id: 'constellation', name: '星座', char: '星',
    description: '查看你的星座特征、今日宜忌和配对分析',
    landingDescription: '星盘轨迹 · 今日宜忌 · 缘分深浅',
    route: '/tools/constellation', available: true, accent: '#7A5E12', trigram: '☲',
  },
  {
    id: 'ziwei', name: '紫微斗数', char: '斗',
    description: '天星回宫 ・ 十二宫精批 ・ 星曜解读 ・ 大限流年',
    landingDescription: '排十二宫垣，解星曜布局与穷通祸福',
    route: '/tools/ziwei', available: true, accent: '#6B5B4F', trigram: '☴',
  },
]

const sessionReady = ref(false)

onMounted(() => {
  restoreSession()
  sessionReady.value = true
})

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen relative">
    <!-- ═══ Loading Skeleton ═══ -->
    <div v-if="!sessionReady" class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
      <div class="space-y-6">
        <div class="mb-12 sm:mb-16">
          <div class="skeleton-pulse h-12 w-64 mb-3 rounded" />
          <div class="skeleton-pulse h-5 w-48 mb-8 rounded" />
          <div class="skeleton-pulse h-px w-44 rounded" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <div v-for="n in 5" :key="n" class="tool-card rounded-xl p-6 sm:p-7">
            <div class="flex items-start gap-4">
              <div class="skeleton-pulse w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0" />
              <div class="min-w-0 flex-1 space-y-2">
                <div class="skeleton-pulse h-6 w-20 rounded" />
                <div class="skeleton-pulse h-4 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════ -->
    <!--  LANDING PAGE — Unauthenticated    -->
    <!-- ════════════════════════════════════ -->
    <template v-if="sessionReady && !currentProfile">
      <div class="relative z-10">

        <!-- ── Hero ── -->
        <section
          class="relative overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div class="relative" style="background:
            radial-gradient(ellipse 50% 40% at 70% 25%, rgba(156,26,28,0.02) 0%, transparent 60%),
            radial-gradient(ellipse 35% 30% at 20% 75%, rgba(44,26,14,0.015) 0%, transparent 50%);">
            <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
              <div class="flex flex-col items-center text-center max-w-2xl mx-auto">

                <!-- Stamp -->
                <div
                  class="anim-rise mb-8"
                >
                  <span
                    class="seal-icon seal-icon--hero"
                    aria-hidden="true"
                  >玄</span>
                </div>

                <!-- Title -->
                <h1
                  id="hero-heading"
                  class="anim-rise anim-delay-1 font-display"
                  style="font-size: 68px; color: #1A0F0A; letter-spacing: 0.3em; line-height: 1.2; margin-bottom: 12px; text-shadow: 0 1px 2px rgba(26,15,10,0.06);"
                >
                  玄<span class="title-dot"></span>道<span class="title-dot"></span><span class="text-cinnabar-deeper">知天命</span>
                </h1>

                <!-- Incantation -->
                <div class="hero-incant anim-rise anim-delay-2">
                  <span class="hero-incant__line">玄天机</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">道命理</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">玄道在手</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">天地万物</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">皆可问之</span>
                </div>

                <!-- CTA -->
                <div class="anim-rise anim-delay-4 flex gap-4 mt-10">
                  <button
                    class="btn-cin"
                    @click="goToLogin"
                  >
                    开始推演
                  </button>
                  <NuxtLink
                    to="/login"
                    class="btn-ink no-underline"
                  >
                    已有档案
                  </NuxtLink>
                </div>

              </div>
            </div>
          </div>
        </section>

        <!-- ── 术数工具 ── -->
        <section
          class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 sm:pt-24 sm:pb-16"
          aria-label="术数工具"
        >
          <div class="section-header">
            <span class="bar" aria-hidden="true"></span>
            <h2>术 数 工 具</h2>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <template v-for="(tool, index) in tools" :key="tool.id">
              <!-- Available tools -->
              <NuxtLink
                v-if="tool.available"
                :to="tool.route"
                :aria-label="'探索' + tool.name"
                class="tool-card--new block no-underline group"
              >
                <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
                <span class="seal-icon seal-icon--lg" style="margin-bottom:20px;">{{ tool.char }}</span>
                <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:8px;transition:color 0.3s;">{{ tool.name }}</div>
                <p class="ui" style="font-size:10px;color:var(--color-ink-light);letter-spacing:0.12em;line-height:1.7;">
                  {{ tool.landingDescription }}
                </p>
              </NuxtLink>

              <!-- Locked tools -->
              <div
                v-else
                :aria-label="tool.name + '（即将推出）'"
                aria-disabled="true"
                class="tool-card--new opacity-50 cursor-default"
              >
                <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
                <div class="seal-icon seal-icon--lg" style="margin-bottom:20px;background:var(--color-ink-light);box-shadow:none;">{{ tool.char }}</div>
                <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:8px;">{{ tool.name }}</div>
                <p class="ui" style="font-size:10px;color:var(--color-ink-light);letter-spacing:0.12em;line-height:1.7;">
                  {{ tool.landingDescription }}
                </p>
              </div>
            </template>
          </div>

          <!-- 更多工具提示 -->
          <div class="text-center mt-6">
            <NuxtLink to="/login" class="btn-ink no-underline inline-flex">
              探索全部工具
            </NuxtLink>
          </div>
        </section>

        <!-- ── 命盘预览 ── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div class="section-header">
            <span class="bar" aria-hidden="true"></span>
            <h2>命 盘 预 览</h2>
          </div>

          <div class="card-warm card-warm--elevated p-6 sm:p-10 lg:p-11">
            <!-- 天地界栏 -->
            <div class="rule-boundary rule-boundary--top" aria-hidden="true"></div>
            <div class="rule-boundary rule-boundary--bottom" aria-hidden="true"></div>
            <div class="fish-tail" aria-hidden="true"><span class="fish-tail__v"></span><span class="fish-tail__bar"></span></div>

            <!-- Header -->
            <div class="flex items-center gap-3 pb-4 mb-6" style="border-bottom:1px solid rgba(156,26,28,0.02);flex-wrap:wrap;">
              <span class="seal-icon" aria-hidden="true">命</span>
              <h3 class="font-display" style="font-size:20px;color:var(--color-ink);letter-spacing:0.3em;">八字命盘</h3>
              <span class="ui" style="margin-left:auto;font-size:10px;color:var(--color-ink-light);letter-spacing:0.15em;">甲辰年 · 丙寅月 · 戊午日 · 壬子时</span>
            </div>

            <!-- 日主 -->
            <div class="text-center mb-5">
              <p class="ui" style="font-size:10px;color:var(--color-ink-light);letter-spacing:0.15em;margin-bottom:10px;">甲辰年 · 阳历 · 生肖龙 · 男</p>
              <div class="master-block">
                <span class="master-block__box">
                  <span class="master-block__big">戊</span>
                  <span class="master-block__sub">土</span>
                </span>
                <span class="ui" style="font-size:10px;padding:3px 10px;background:rgba(44,26,14,0.035);color:var(--color-ink-mid);letter-spacing:0.1em;">身弱</span>
              </div>
              <div class="ui" style="font-size:9px;color:var(--color-ink-light);letter-spacing:0.3em;margin-top:4px;">日 主</div>
            </div>

            <!-- 喜忌 -->
            <div class="flex items-center justify-center gap-2 flex-wrap pb-2 mb-4">
              <span class="ui" style="font-size:10px;color:var(--color-ink-mid);letter-spacing:0.2em;">喜</span>
              <span class="ui" style="padding:2px 10px;font-size:13px;letter-spacing:0.1em;border-radius:2px;color:#C62828;">火</span>
              <span class="ui" style="padding:2px 10px;font-size:13px;letter-spacing:0.1em;border-radius:2px;color:#3D6B4B;">木</span>
              <span style="width:1px;height:14px;background:rgba(44,26,14,0.05);margin:0 4px;" aria-hidden="true"></span>
              <span class="ui" style="font-size:10px;color:var(--color-ink-mid);letter-spacing:0.2em;">忌</span>
              <span class="ui" style="padding:2px 10px;font-size:13px;letter-spacing:0.1em;border-radius:2px;color:#5E5E5E;">金</span>
              <span class="ui" style="padding:2px 10px;font-size:13px;letter-spacing:0.1em;border-radius:2px;color:#2C5F7C;">水</span>
              <span class="ui" style="padding:2px 10px;font-size:13px;letter-spacing:0.1em;border-radius:2px;color:#7A5E12;">土</span>
            </div>

            <!-- 八字表 -->
            <div class="mb-6 overflow-x-auto">
              <table class="grid-cinnabar">
                <thead>
                  <tr>
                    <th>年 柱</th>
                    <th>月 柱</th>
                    <th class="is-day">日 柱<span class="mk">日主</span></th>
                    <th>时 柱</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="color:#3D6B4B;">甲</td>
                    <td style="color:#C62828;">丙</td>
                    <td class="is-day" style="color:#7A5E12;">戊</td>
                    <td style="color:#2C5F7C;">壬</td>
                  </tr>
                  <tr>
                    <td style="color:#7A5E12;font-size:20px;padding-top:0;">辰</td>
                    <td style="color:#3D6B4B;font-size:20px;padding-top:0;">寅</td>
                    <td class="is-day" style="color:#C62828;font-size:20px;padding-top:0;">午</td>
                    <td style="color:#2C5F7C;font-size:20px;padding-top:0;">子</td>
                  </tr>
                  <tr>
                    <td class="sub"><span class="badge-sm" style="background:rgba(198,40,40,0.07);color:#C62828;">偏官</span></td>
                    <td class="sub"><span class="badge-sm" style="background:rgba(61,107,75,0.07);color:#3D6B4B;">偏印</span></td>
                    <td class="sub is-day"><span class="badge-sm" style="background:rgba(44,26,14,0.07);color:var(--color-ink);">日主</span></td>
                    <td class="sub"><span class="badge-sm" style="background:rgba(45,95,124,0.07);color:#2C5F7C;">食神</span></td>
                  </tr>
                  <tr>
                    <td><span class="zang"><span style="color:#7A5E12;">戊</span> <span style="color:#2C5F7C;">癸</span> <span style="color:#3D6B4B;">乙</span></span></td>
                    <td><span class="zang"><span style="color:#3D6B4B;">甲</span> <span style="color:#C62828;">丙</span> <span style="color:#7A5E12;">戊</span></span></td>
                    <td class="is-day"><span class="zang"><span style="color:#C62828;">丁</span> <span style="color:#7A5E12;">己</span></span></td>
                    <td><span class="zang"><span style="color:#2C5F7C;">癸</span></span></td>
                  </tr>
                  <tr>
                    <td class="nayin">覆灯火</td>
                    <td class="nayin">炉中火</td>
                    <td class="nayin is-day">天上火</td>
                    <td class="nayin">桑柘木</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 五行柱 -->
            <div class="grid grid-cols-5 gap-3 py-5 mb-4" style="border-top:1px solid rgba(156,26,28,0.015);border-bottom:1px solid rgba(156,26,28,0.015);">
              <div v-for="(item, i) in [
                { label: '木', pct: 40, color: '#3D6B4B' },
                { label: '火', pct: 60, color: '#C62828' },
                { label: '土', pct: 80, color: '#7A5E12' },
                { label: '金', pct: 20, color: '#5E5E5E' },
                { label: '水', pct: 30, color: '#2C5F7C' },
              ]" :key="i" class="text-center">
                <div class="ui" style="font-size:10px;color:var(--color-ink-mid);margin-bottom:8px;letter-spacing:0.1em;">{{ item.label }}</div>
                <div style="height:80px;background:rgba(44,26,14,0.015);position:relative;overflow:hidden;margin-bottom:6px;">
                  <div class="absolute bottom-0 left-0 right-0" :style="{ height: item.pct + '%', background: item.color, opacity: 0.25 }"></div>
                </div>
                <div class="ui" style="font-size:9px;color:var(--color-ink-light);">{{ item.pct }}%</div>
              </div>
            </div>

            <!-- 解读 -->
            <div class="flex gap-3 items-start pt-1">
              <span class="seal-icon" style="width:26px;height:26px;font-size:10px;transform:rotate(-5deg);margin-top:4px;" aria-hidden="true">解</span>
              <p class="ui" style="font-size:14px;color:var(--color-ink-mid);line-height:2;letter-spacing:0.04em;">
                "日主戊土生于寅月，木旺土虚，喜火生扶。早年财运亨通，中年宜守成。五行土旺缺金，宜补金气以平衡全局。"
              </p>
            </div>
          </div>
        </section>

        <!-- ── 今日运势 ── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div class="section-header">
            <span class="bar" aria-hidden="true"></span>
            <h2>今 日 运 势</h2>
          </div>

          <div class="card-warm p-6 sm:p-8 max-w-lg mx-auto">
            <div class="flex items-center gap-2 mb-3">
              <span class="seal-icon" style="width:20px;height:20px;font-size:8px;transform:rotate(-4deg);" aria-hidden="true">日</span>
              <span style="font-size:13px;color:var(--color-ink-mid);letter-spacing:0.25em;">今日运势</span>
              <span class="ui" style="margin-left:auto;font-size:9px;color:var(--color-ink-faint);letter-spacing:0.1em;">五月三十 · 星期日</span>
            </div>
            <p class="ui" style="font-size:14px;color:var(--color-ink-mid);line-height:2;">今日宜静思，忌急躁。命主日干逢合，利于人际沟通，但需注意言辞分寸。申时过后运势渐佳，可把握机会推进重要事项。</p>
            <div class="flex gap-6 mt-3 pt-3 flex-wrap" style="border-top:1px solid rgba(156,26,28,0.015);">
              <span class="ui" style="font-size:10px;color:#3D6B4B;letter-spacing:0.12em;">宜：静思 · 沟通 · 规划</span>
              <span class="ui" style="font-size:10px;color:var(--color-cinnabar-deeper);letter-spacing:0.12em;">忌：冲动 · 投资 · 远行</span>
            </div>
          </div>
        </section>

        <!-- ── 命簿卡片 ── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div class="section-header">
            <span class="bar" aria-hidden="true"></span>
            <h2>命 簿 卡 片</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div class="card-warm p-6 sm:p-8 group">
              <span class="corner-mark corner-mark-tl" aria-hidden="true">☰</span>
              <span class="corner-mark corner-mark-br" aria-hidden="true">☷</span>
              <span class="seal-icon" style="width:32px;height:32px;font-size:13px;margin-bottom:16px;" aria-hidden="true">性</span>
              <h4 style="font-size:20px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:3px;">性格特征</h4>
              <p class="ui" style="font-size:11px;color:var(--color-ink-light);letter-spacing:0.15em;margin-bottom:12px;">戊土日主 · 厚重沉稳</p>
              <p class="ui" style="font-size:13px;color:var(--color-ink-mid);line-height:2;letter-spacing:0.04em;">命主戊土日主，生于寅月，木旺土虚。性格沉稳厚重，有担当之心。然土虚则易思虑过度，宜培养决断之力。</p>
            </div>
            <div class="card-warm p-6 sm:p-8 group">
              <span class="corner-mark corner-mark-tl" aria-hidden="true">☲</span>
              <span class="corner-mark corner-mark-br" aria-hidden="true">☵</span>
              <span class="seal-icon" style="width:32px;height:32px;font-size:13px;margin-bottom:16px;" aria-hidden="true">配</span>
              <h4 style="font-size:20px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:3px;">相性配对</h4>
              <p class="ui" style="font-size:11px;color:var(--color-ink-light);letter-spacing:0.15em;margin-bottom:12px;">生肖三合 · 六合贵人</p>
              <p class="ui" style="font-size:13px;color:var(--color-ink-mid);line-height:2;letter-spacing:0.04em;">与属牛、属蛇者最为相合，三合之势助运增财。与属猪者相冲，宜避之。与属虎、属马者六合，可成事业良伴。</p>
            </div>
          </div>
        </section>

        <!-- ── 分割线 + CTA ── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 sm:py-12 sm:pb-20">
          <div class="divider-seal mb-10">
            <span class="divider-seal__line" aria-hidden="true"></span>
            <span class="seal-icon" style="width:26px;height:26px;font-size:10px;" aria-hidden="true">玄</span>
            <span class="divider-seal__word">玄 · 道</span>
            <span class="seal-icon" style="width:26px;height:26px;font-size:10px;" aria-hidden="true">道</span>
            <span class="divider-seal__line" aria-hidden="true"></span>
          </div>

          <div class="flex justify-center gap-4 flex-wrap">
            <button class="btn-cin" @click="goToLogin">开始推演</button>
            <NuxtLink to="/login" class="btn-ink no-underline">浏览命盘</NuxtLink>
          </div>
        </section>

        <!-- ── Footer ── -->
        <footer class="border-t" style="border-color:rgba(44,26,14,0.03);" role="contentinfo">
          <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="font-display" style="font-size:15px;color:var(--color-ink);letter-spacing:0.3em;">玄 · 道</span>
                <span style="font-size:9px;color:var(--color-ink-faint);">·</span>
                <span class="ui" style="font-size:11px;color:var(--color-ink-light);">玄天机 · 道命理</span>
              </div>
              <p class="ui" style="font-size:11px;color:var(--color-ink-faint);">
                &copy; {{ new Date().getFullYear() }} 玄 · 道 · 仅供娱乐参考
              </p>
            </div>
          </div>
        </footer>

      </div>
    </template>

    <!-- ════════════════════════════════════ -->
    <!--  AUTHENTICATED                      -->
    <!-- ════════════════════════════════════ -->
    <template v-if="sessionReady && currentProfile">
      <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        <!-- Greeting -->
        <div class="mb-12 sm:mb-16 anim-rise">
          <div class="flex flex-col items-start gap-3">
            <div class="flex items-center gap-4">
              <span class="hidden sm:block w-6 h-px" style="background:linear-gradient(to right, rgba(156,26,28,0.4), transparent);" aria-hidden="true" />
              <h1 class="font-display text-4xl sm:text-5xl" style="color:var(--color-ink);letter-spacing:0.05em;">
                {{ greeting.prefix }}，<span class="text-cinnabar-deeper">{{ currentProfile.nickname }}</span>
              </h1>
            </div>
            <div class="flex items-center gap-3 ml-0 sm:ml-10">
              <span class="seal-icon" style="width:28px;height:28px;font-size:11px;" aria-hidden="true">玄</span>
              <p class="ui" style="font-size:14px;color:var(--color-ink-light);letter-spacing:0.15em;">
                {{ greeting.subtitle }}
              </p>
            </div>
          </div>
        </div>

        <!-- Section header -->
        <div class="section-header anim-rise anim-delay-1">
          <span class="bar" aria-hidden="true"></span>
          <h2>推 演 工 具</h2>
        </div>

        <!-- Tool grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <NuxtLink
            v-for="(tool, index) in tools.filter(t => t.available)"
            :key="tool.id"
            :to="tool.route"
            :aria-label="'打开' + tool.name + '工具'"
            class="tool-card--new block no-underline group anim-rise"
            :class="'anim-delay-' + (index + 1)"
          >
            <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
            <span class="seal-icon seal-icon--lg" style="margin-bottom:16px;">{{ tool.char }}</span>
            <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:4px;">{{ tool.name }}</div>
            <p class="ui" style="font-size:12px;color:var(--color-ink-light);letter-spacing:0.08em;line-height:1.6;">{{ tool.description }}</p>
          </NuxtLink>

          <div
            v-for="(tool, index) in tools.filter(t => !t.available)"
            :key="tool.id"
            :aria-label="tool.name + '（即将上线）'"
            aria-disabled="true"
            class="tool-card--new opacity-50 cursor-default anim-rise"
            :class="'anim-delay-' + (tools.filter(t => t.available).length + index + 1)"
          >
            <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
            <span class="seal-icon seal-icon--lg" style="margin-bottom:16px;background:var(--color-ink-light);box-shadow:none;">{{ tool.char }}</span>
            <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:4px;">{{ tool.name }}</div>
            <p class="ui" style="font-size:12px;color:var(--color-ink-light);letter-spacing:0.08em;line-height:1.6;">{{ tool.description }}</p>
            <span class="ui" style="position:absolute;top:12px;right:12px;padding:2px 8px;border-radius:999px;font-size:9px;border:1px solid rgba(44,26,14,0.08);color:var(--color-ink-light);">即将推出</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
