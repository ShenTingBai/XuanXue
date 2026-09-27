<script setup lang="ts">
/**
 * 共享年龄声明 checkbox（十四周岁门槛，数据规范 §5.4）。
 *
 * 2026-09-27 工具页主体收敛（design-system §4.2b）：八字与生肖此前各写一套
 * 年龄确认控件（单个 checkbox vs 「已满 / 未满」双 radio 三态），本组件把控件
 * 统一为一个文件：单个 type=checkbox（sr-only 原生输入）、choice-control--block
 * 整块命中区、choice-control__indicator--box 方框指示器、同一段完整长文案。
 *
 * 边界：
 * - 只承载声明与状态，不含计算、账号或提交逻辑；生成门禁由父页面实现；
 * - 文案以八字现有声明为单一真源，两个页面逐字一致，不在本组件分叉；
 * - data-age-confirmation 是通用回归钩子；data-bazi-age 是八字历史钩子，
 *   两者保留在同一个真实 input 上（既有测试与可访问性都依赖真实 input）。
 *
 * @author LiXinwen
 */
defineProps<{
  /** 当前勾选状态（v-model）。 */
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

/** 原生 change 事件只取勾选布尔值，事件对象不外泄。 */
function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <!-- 块级变体由全局 choice-control--block 提供：整块可点、indicator 与首行对齐 -->
  <label class="choice-control choice-control--block">
    <input
      type="checkbox"
      class="sr-only"
      :checked="modelValue"
      data-age-confirmation
      data-bazi-age
      @change="onChange"
    />
    <span class="choice-control__indicator choice-control__indicator--box" aria-hidden="true" />
    <span class="choice-control__text">
      我已满十四周岁。未满十四周岁时不提供个人出生日期的排盘计算，但仍可阅读本页的规则与来源说明。
    </span>
  </label>
</template>
