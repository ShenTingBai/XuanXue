<script setup lang="ts">
import PageFooter from '~/components/tools/PageFooter.vue'
import { CURRENT_SERVICE_TERMS_VERSION } from '~/constants/account-policy'

useSeoMeta({
  title: '服务规则 — 玄·道',
  ogTitle: '服务规则 — 玄·道',
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
          服务规则
        </h1>
        <p class="font-sans text-sm text-ink-medium tracking-[0.1em]">玄·道 — 传统文化自我探索</p>
        <p class="font-sans text-xs text-ink-light tracking-[0.08em] mt-2">
          版本：{{ CURRENT_SERVICE_TERMS_VERSION }}
        </p>
      </header>

      <div class="card-paper-solid rounded-xl p-8 space-y-8">
        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">一、服务定位</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            本平台处于公开预览阶段（public_preview），定位为传统文化自我探索工具。所有内容仅供文化参考与自我了解，不构成对现实生活的任何决策依据，不提供专业建议。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">二、账号使用</h2>
          <ul class="font-sans text-sm text-ink-medium leading-relaxed space-y-2 ml-4">
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>您需为注册时提供的昵称与密码凭证负责，妥善保管登录凭证。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-cinnabar flex-shrink-0" aria-hidden="true">-</span>
              <span>每个设备使用独立会话；您可在账号页退出当前设备或退出所有设备。</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">三、年龄边界</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            未满十四周岁的用户不能注册本平台账号。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">四、禁止滥用</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            请勿滥用本平台服务，包括但不限于自动化批量注册、恶意攻击或干扰平台正常运行的行为。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">五、工具围栏</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            当前阶段没有对访客开放的推演工具。工具正在逐项核验，确认规则与来源后再逐步开放；届时可能按单独的服务条款与确认流程使用。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">六、注销与退出</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            您可在账号页随时退出当前设备、退出所有设备，或在输入昵称和密码确认后注销账号。注销将删除账号及其关联数据并使其全部会话失效。
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl text-ink-dark tracking-[0.1em] mb-3">七、规则更新</h2>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            我们可能会更新本服务规则。更新后的版本会在本页面发布并注明版本号。
          </p>
        </section>
      </div>
    </div>

    <PageFooter />
  </div>
</template>
