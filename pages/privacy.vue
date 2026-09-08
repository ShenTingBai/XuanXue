<script setup lang="ts">
import PageFooter from '~/components/tools/PageFooter.vue'
import { CURRENT_PRIVACY_POLICY_VERSION } from '~/constants/account-policy'

useSeoMeta({
  title: '隐私政策 — 玄·道',
  ogTitle: '隐私政策 — 玄·道',
  description: '传统文化自我探索。',
  ogDescription: '传统文化自我探索。',
  ogType: 'website',
})
</script>

<template>
  <div class="full-viewport relative">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
      <header class="mb-10 text-center">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark tracking-[0.15em] mb-3">
          隐私政策
        </h1>
        <p class="font-sans text-sm text-ink-medium tracking-[0.1em]">玄·道 — 传统文化自我探索</p>
        <p class="font-sans text-xs text-ink-light tracking-[0.08em] mt-2">
          版本：{{ CURRENT_PRIVACY_POLICY_VERSION }}
        </p>
      </header>

      <div class="card-paper-solid rounded-xl p-8 space-y-8">
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">一、概述</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            欢迎使用"玄·道"（以下简称"本平台"）。本平台是一个传统文化自我探索工具集合。本隐私政策说明当前阶段我们如何收集、使用和保护您的信息。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">
            二、我们收集的信息
          </h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed mb-3">
            当前阶段，我们只收集账号运行所需的最小信息：
          </p>
          <ul class="font-sans text-sm text-ink-medium leading-relaxed space-y-2 ml-4">
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">昵称</strong
                >：用于识别您的账号，不要求使用真实姓名。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">密码凭证哈希</strong
                >：使用加盐哈希存储，不保存明文密码。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">会话信息</strong>：通过 HttpOnly Cookie
                维持登录状态。</span
              >
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span
                ><strong class="text-ink-dark">最小安全日志</strong
                >：记录登录、退出、注销等安全事件，IP 仅以不可逆摘要形式保留。</span
              >
            </li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">
            三、我们不收集的内容
          </h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            本平台不会自动收集您的出生资料，也不会自动保存任何工具计算结果。工具计算、本人档案与结果历史将在后续阶段按单独的确认流程开放。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">
            四、数据存储与安全
          </h2>
          <ul class="font-sans text-sm text-ink-medium leading-relaxed space-y-2 ml-4">
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>您的数据存储在本平台的本地数据库中，不传输至第三方服务。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>会话令牌经哈希后存储；每个设备独立会话，登录不会注销其他设备。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>会话有效期七天，过期自动清理。</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">五、您的权利</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed mb-3">
            您可以在账号页执行当前设备退出、退出所有设备，以及输入昵称和密码确认后注销账号。注销将删除账号及其关联数据并使其全部会话失效。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">六、未成年人保护</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            本平台不面向未满十四周岁的未成年人提供服务；注册时必须确认已满十四周岁。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">七、政策更新</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            我们可能会更新本隐私政策。更新后的版本会在本页面发布并注明版本号。
          </p>
        </section>
      </div>
    </div>

    <PageFooter />
  </div>
</template>
