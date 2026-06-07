<script setup lang="ts">
import PageFooter from '~/components/tools/PageFooter.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'

useSeoMeta({
  title: '隐私政策 — 玄·道',
  ogTitle: '隐私政策 — 玄·道',
  description: '玄·道隐私政策，了解我们如何收集、使用和保护您的个人信息。',
  ogDescription: '玄·道隐私政策，了解我们如何收集、使用和保护您的个人信息。',
  ogType: 'website',
})
</script>

<template>
  <div class="min-h-screen relative">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
      <!-- Page Title -->
      <header class="mb-10 text-center">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark tracking-[0.15em] mb-3">
          隐私政策
        </h1>
        <p class="font-sans text-sm text-ink-medium tracking-[0.1em]">玄·道 — 传统命理推演平台</p>
        <p class="font-sans text-xs text-ink-light tracking-[0.08em] mt-2">
          生效日期：2026 年 6 月 7 日
        </p>
      </header>

      <!-- Content Card -->
      <div class="card-paper-solid rounded-xl p-8 space-y-8">
        <!-- 1. 概述 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">一、概述</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            欢迎使用"玄·道"（以下简称"本平台"）。本平台是一个传统命理推演工具集合，提供八字排盘、紫微斗数、六爻占卜、生肖星座等术数功能。我们深知个人信息的重要性，本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息，以及您享有的相关权利。
          </p>
          <p class="font-sans text-sm text-ink-medium leading-relaxed mt-3">
            请在使用本平台前仔细阅读本政策。使用本平台即表示您理解并同意本政策的内容。
          </p>
        </section>

        <!-- 2. 收集的信息 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">
            二、我们收集的信息
          </h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed mb-3">
            为了提供命理推演服务，我们可能收集以下信息：
          </p>
          <ul class="font-sans text-sm text-ink-medium leading-relaxed space-y-2 ml-4">
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">昵称（道号）</strong
                >：用于识别您的账户，不强制使用真实姓名。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">出生日期</strong
                >：用于八字排盘、生肖计算等命理推演。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">出生时辰</strong>：用于时柱推算和紫微斗数排盘。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">性别</strong
                >：用于大运排盘方向判定（阳男阴女顺排、阴男阳女逆排）。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span><strong class="text-ink-dark">出生地</strong>：用于真太阳时校正参考。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">IP 地址</strong
                >：用于安全日志记录和访问频率限制，不用于用户画像或追踪。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">命理推演记录</strong
                >：您使用各工具时的输入数据和计算结果，用于历史记录回看。</span
              >
            </li>
          </ul>
        </section>

        <!-- 3. 信息用途 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">三、信息用途</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed mb-3">
            我们收集的信息仅用于以下目的：
          </p>
          <ul class="font-sans text-sm text-ink-medium leading-relaxed space-y-2 ml-4">
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>提供命理推演计算服务（八字、紫微、星座、生肖等）。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>识别用户身份，管理您的个人档案和历史记录。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>保障平台安全，防止恶意访问和滥用。</span>
            </li>
          </ul>
        </section>

        <!-- 4. 存储方式 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">
            四、数据存储与安全
          </h2>
          <ul class="font-sans text-sm text-ink-medium leading-relaxed space-y-2 ml-4">
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                >您的数据存储在本平台的本地数据库（SQLite）中，<strong class="text-ink-dark"
                  >不会传输至任何第三方服务</strong
                >。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>登录密令经过加密处理（scrypt + 随机盐），我们不存储明文密码。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>会话令牌经过哈希处理后存储，每次登录自动清除旧会话。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>过期会话（超过 7 天）将被自动清理。</span>
            </li>
          </ul>
        </section>

        <!-- 5. 用户权利 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">五、您的权利</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed mb-3">
            根据《中华人民共和国个人信息保护法》，您享有以下权利：
          </p>
          <ul class="font-sans text-sm text-ink-medium leading-relaxed space-y-2 ml-4">
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">访问权</strong
                >：您可以随时查看您的个人档案和命理推演记录。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">更正权</strong
                >：您可以在"命簿"页面修改出生日期、性别、出生地等个人信息。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">删除权</strong
                >：您可以联系管理员删除您的账户及所有相关数据，包括个人档案、会话记录和命理推演历史。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">撤回同意</strong
                >：您可以通过删除账户撤回对本政策的同意。</span
              >
            </li>
          </ul>
        </section>

        <!-- 6. 未成年人保护 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">六、未成年人保护</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            本平台不面向未满 14 周岁的未成年人提供服务。如果您是未满 14
            周岁的未成年人，请在监护人的指导下使用本平台。
          </p>
        </section>

        <!-- 7. 政策更新 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">七、政策更新</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并注明生效日期。重大变更时，我们会在平台上以公告形式通知您。
          </p>
        </section>

        <!-- 8. 联系方式 -->
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">八、联系方式</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            如果您对本隐私政策有任何疑问，或希望行使您的个人信息权利，请通过以下方式联系我们：
          </p>
          <div
            class="mt-3 p-4 rounded-lg border"
            style="
              background: color-mix(in srgb, var(--color-paper-medium) 30%, transparent);
              border-color: color-mix(in srgb, var(--color-ink-faint) 30%, transparent);
            "
          >
            <p class="font-sans text-sm text-ink-medium">
              电子邮箱：<span class="text-cinnabar">[待补充]</span>
            </p>
            <p class="font-sans text-sm text-ink-medium mt-1">
              我们将在 15 个工作日内回复您的请求。
            </p>
          </div>
        </section>
      </div>

      <!-- Disclaimer -->
      <EntertainmentDisclaimer />
    </div>

    <PageFooter />
  </div>
</template>
