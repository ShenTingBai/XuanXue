<script setup lang="ts">
import ProfileDangerSection from '~/components/profile/ProfileDangerSection.vue'
import ProfileSectionHeading from '~/components/profile/ProfileSectionHeading.vue'

/**
 * Ⅳ 归 · 归档与删除：本人档案页的危险操作区。
 *
 * 只承载档案级操作（删除出生日期 / 删除整份档案，均保留账号）；
 * 账号级销毁（注销）不属于本页，避免两类删除混在一起。
 */
defineProps<{
  /** 档案是否存在（决定是否显示删除整档）。 */
  hasProfile: boolean
  /** 是否还有出生日期（决定是否显示删除出生日期）。 */
  hasBirthDate: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  (e: 'delete-date'): void
  (e: 'delete-profile'): void
}>()
</script>

<template>
  <section id="sec-archive" class="editorial-section" data-profile-section>
    <ProfileSectionHeading num="Ⅳ" title="归 · 归档与删除" />

    <ProfileDangerSection body-id="profile-danger-body">
      <div v-if="hasBirthDate" class="danger-item">
        <div>
          <p class="danger-title">删除出生日期</p>
          <p>删除已保存的日期字段组并停止档案带入；档案、账号与内容偏好保留。此操作不可撤销。</p>
        </div>
        <button type="button" class="btn-quiet" :disabled="busy" @click="emit('delete-date')">
          删除出生日期
        </button>
      </div>

      <div v-if="hasProfile" class="danger-item">
        <div>
          <p class="danger-title">删除整份本人档案</p>
          <p>清除本人档案与使用授权，不删除账号或会话。此操作不可撤销。</p>
        </div>
        <button type="button" class="btn-quiet" :disabled="busy" @click="emit('delete-profile')">
          删除整份档案
        </button>
      </div>

      <div v-if="!hasProfile" class="danger-item">
        <div>
          <p class="danger-title">没有可删除的档案</p>
          <p>当前账号名下还没有本人档案。填入出生日期并确认保存后才需要归档操作。</p>
        </div>
      </div>
    </ProfileDangerSection>
  </section>
</template>
