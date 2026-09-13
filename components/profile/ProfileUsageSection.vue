<script setup lang="ts">
import { computed } from 'vue'
import ProfileSectionHeading from '~/components/profile/ProfileSectionHeading.vue'
import ProfileNote from '~/components/profile/ProfileNote.vue'

/**
 * Ⅱ 授 · 授权与用途：带入状态行 + 四类用途矩阵 + 提示条。
 *
 * 用途矩阵逐行对齐《用户档案与数据生命周期产品规范》§10.1，是已批准产品规则，
 * 不在此处新增或改写任何一行；状态文案只由「是否有日期 + 是否允许带入」决定。
 */

const props = defineProps<{
  hasDate: boolean
  useAllowed: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  (e: 'stop'): void
  (e: 'allow'): void
  (e: 'refill'): void
}>()

const mode = computed<'refill' | 'stop' | 'allow'>(() => {
  if (!props.hasDate) return 'refill'
  return props.useAllowed ? 'stop' : 'allow'
})

const stateText = computed(() => {
  if (mode.value === 'refill') return '不可用'
  return mode.value === 'stop' ? '已开启' : '已停止'
})

const description = computed(() => {
  if (mode.value === 'refill') {
    return '还没有出生日期，无法带入。重新填写出生日期后，可以选择是否允许带入。'
  }
  if (mode.value === 'stop') {
    return '工具可一次性把已确认的字段填充到当次草稿，不会自动开始计算，也不会改写档案。'
  }
  return '已停止从档案带入工具。出生日期仍保存在档案中，可随时重新允许；重新允许需要再次同意当前告知版本。'
})

const actionLabel = computed(() => {
  if (mode.value === 'refill') return '重新填写出生日期'
  return mode.value === 'stop' ? '停止后续带入' : '重新允许带入'
})

function onAction() {
  if (props.busy) return
  if (mode.value === 'refill') emit('refill')
  else if (mode.value === 'stop') emit('stop')
  else emit('allow')
}

/** 四类用途：与规范 §10.1 一致。 */
const purposes = [
  { use: '本次计算', action: '阅读就近说明后主动提交', defaultSave: '否', crossEffect: '否' },
  {
    use: '保存本人档案',
    action: '主动发起并确认字段差异',
    defaultSave: '是',
    crossEffect: '不代表保存结果',
  },
  {
    use: '保存本次结果',
    action: '主动确认结果快照内容',
    defaultSave: '是',
    crossEffect: '不代表更新档案',
  },
  {
    use: '保存内容偏好',
    action: '主动选择偏好',
    defaultSave: '是',
    crossEffect: '不得用于命理与现实推断',
  },
]
</script>

<template>
  <section id="sec-usage" class="editorial-section" data-profile-section>
    <ProfileSectionHeading num="Ⅱ" title="授 · 授权与用途" />

    <div class="usage">
      <div class="usage-row">
        <div>
          <span class="usage-state">
            <span class="dot" :class="{ 'is-off': mode !== 'stop' }" aria-hidden="true" />
            <span class="num">{{ stateText }}</span>
          </span>
          <p class="usage-title">档案带入</p>
          <p class="usage-desc">{{ description }}</p>
        </div>
        <button type="button" class="btn-quiet" :disabled="busy" @click="onAction">
          {{ actionLabel }}
        </button>
      </div>
    </div>

    <table class="purpose-table">
      <caption class="sr-only">
        四类用途及其默认保存行为
      </caption>
      <thead>
        <tr>
          <th scope="col">用途</th>
          <th scope="col">用户动作</th>
          <th scope="col">默认保存</th>
          <th scope="col">可否影响其他用途</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in purposes" :key="row.use">
          <td data-label="用途">{{ row.use }}</td>
          <td data-label="用户动作">{{ row.action }}</td>
          <td class="num-cell" data-label="默认保存">{{ row.defaultSave }}</td>
          <td data-label="可否影响其他用途">{{ row.crossEffect }}</td>
        </tr>
      </tbody>
    </table>

    <ProfileNote>
      停止后续带入只停止未来的使用；已经保存的出生日期不会被删除。删除已有数据是另一个操作，见「Ⅳ 归
      · 归档与删除」。
    </ProfileNote>
  </section>
</template>

<style scoped>
.usage {
  margin-bottom: 26px;
  padding: 22px 24px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 16px;
  background: var(--color-paper-light);
}

.usage-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.usage-state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.75rem;
  color: var(--color-ink-medium);
}

.dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-jade, #3d6b4b);
}

.dot.is-off {
  background: var(--color-ink-medium);
}

.usage-title {
  margin: 0 0 5px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-ink-dark);
}

.usage-desc {
  max-width: 60ch;
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-medium);
}

.purpose-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.purpose-table th,
.purpose-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-ink-faint);
  text-align: left;
  vertical-align: top;
  color: var(--color-ink-dark);
}

.purpose-table th {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--color-ink-medium);
}

.purpose-table td:first-child {
  font-weight: 500;
}

.num-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* 窄屏把矩阵转成卡片：表头隐藏，用 data-label 保留列名语义。 */
@media (max-width: 720px) {
  .purpose-table thead {
    display: none;
  }

  .purpose-table,
  .purpose-table tbody,
  .purpose-table tr,
  .purpose-table td {
    display: block;
    width: 100%;
  }

  .purpose-table tr {
    margin-bottom: 12px;
    padding: 12px 14px;
    border: 1px solid var(--color-ink-faint);
    border-radius: 10px;
  }

  .purpose-table td {
    padding: 4px 0;
    border: 0;
  }

  .purpose-table td::before {
    content: attr(data-label) '：';
    font-size: 0.75rem;
    color: var(--color-ink-medium);
  }
}
</style>
