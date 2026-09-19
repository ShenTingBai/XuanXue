<script setup lang="ts">
import SectionHeading from '~/components/editorial/SectionHeading.vue'
import ProfileNote from '~/components/profile/ProfileNote.vue'

/**
 * Ⅲ 溯 · 溯源与范围：告知版本、已保存内容、未保存内容与边界提示。
 *
 * 版本号来自 constants/self-profile-policy 的真实告知版本，不使用设计稿示例值。
 * 键值排版使用全局 .editorial-fact*（与账号页共用）。
 */
defineProps<{
  policyVersion: string
}>()
</script>

<template>
  <section id="sec-scope" class="editorial-section" data-profile-section>
    <SectionHeading num="Ⅲ" title="溯 · 溯源与范围" />

    <div class="editorial-facts">
      <div class="editorial-fact">
        <span class="editorial-fact-key">告知与隐私</span>
        <p>
          <NuxtLink to="/privacy" class="editorial-link">查看《告知与隐私政策》全文</NuxtLink>
          · 当前版本 <span class="editorial-num">{{ policyVersion }}</span>
        </p>
      </div>
      <div class="editorial-fact">
        <span class="editorial-fact-key">我们保存了什么</span>
        <p>
          出生日期字段组：原始历法表达 ＋ 原始年、月、日与闰月状态 ＋ 规范化公历日期 ＋ 转换规则版本
          ＋ 最后确认时间。
        </p>
      </div>
      <div class="editorial-fact">
        <span class="editorial-fact-key">我们没有保存</span>
        <p>
          真实姓名 · 出生时刻 · 出生地点 · 排盘性别参数 · 关系 / 工作 / 健康等现实状态 · 他人资料。
        </p>
      </div>
    </div>

    <ProfileNote>
      出生时刻、出生地点与排盘参数，将在确有已核验工具需要时逐步加入；在此之前不设字段、不出待办，也不显示任何「完整度」。未知始终保持为未知。
    </ProfileNote>
  </section>
</template>
