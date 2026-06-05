<template>
  <div class="overflow-x-auto -mx-4 sm:mx-0">
    <table class="w-full text-sm font-sans border-collapse" aria-label="纳甲装卦详表">
      <thead>
        <tr class="bg-paper-dark">
          <th
            scope="col"
            class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap"
          >
            爻位
          </th>
          <th
            scope="col"
            class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap"
            title="天干地支配卦"
          >
            纳甲
          </th>
          <th
            scope="col"
            class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap"
            title="此爻地支所属五行"
          >
            五行
          </th>
          <th
            scope="col"
            class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap"
            title="爻与日主的关系：父母主文书、兄弟主竞争、官鬼主事业、妻财主财运、子孙主福神"
          >
            六亲
          </th>
          <th
            scope="col"
            class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap"
            title="当日值日之神：青龙主喜、朱雀主口舌、勾陈主田土、螣蛇主虚惊、白虎主刑伤、玄武主暗昧"
          >
            六神
          </th>
          <th
            scope="col"
            class="px-2 sm:px-3 py-2 text-center text-xs text-ink tracking-wider whitespace-nowrap"
            title="世为自己，应为对方"
          >
            世应
          </th>
          <th
            scope="col"
            class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap"
          >
            爻辞
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(line, idx) in lines"
          :key="line.position"
          :class="[
            'border-b zgt-row transition-colors',
            line.yao.isChanging
              ? 'zgt-row--changing'
              : idx % 2 === 0
                ? 'zgt-row--even'
                : 'bg-transparent',
          ]"
        >
          <!-- 爻位 -->
          <td class="px-2 sm:px-3 py-2.5 whitespace-nowrap">
            <span class="font-medium" :class="{ 'text-cinnabar': line.yao.isChanging }">
              {{ line.positionName }}
              <span v-if="line.yao.isChanging" class="text-cinnabar text-xs ml-0.5">(变)</span>
            </span>
          </td>

          <!-- 纳甲 -->
          <td class="px-2 sm:px-3 py-2.5 whitespace-nowrap font-sans tabular-nums text-ink">
            {{ line.naJiaDisplay }}
          </td>

          <!-- 五行 -->
          <td class="px-2 sm:px-3 py-2.5 whitespace-nowrap">
            <span
              class="inline-block px-1.5 py-0.5 rounded text-xs font-medium zgt-wx-badge"
              :style="{ '--_wx': wuxingTextColor(line.branchWuxing) }"
            >
              {{ line.branchWuxing }}
            </span>
          </td>

          <!-- 六亲 -->
          <td class="px-2 sm:px-3 py-2.5 whitespace-nowrap">
            <span
              class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
              :class="sixRelationClass(line.sixRelation)"
            >
              {{ line.sixRelation }}
            </span>
          </td>

          <!-- 六神 -->
          <td class="px-2 sm:px-3 py-2.5 whitespace-nowrap">
            <span :class="sixSpiritClass(line.sixSpirit)">
              {{ line.sixSpirit }}
            </span>
          </td>

          <!-- 世应 -->
          <td class="px-2 sm:px-3 py-2.5 text-center whitespace-nowrap">
            <span
              v-if="line.isShi"
              class="inline-flex items-center justify-center w-6 h-6 rounded-full zgt-badge--shi text-xs font-medium"
              >世</span
            >
            <span
              v-else-if="line.isYing"
              class="inline-flex items-center justify-center w-6 h-6 rounded-full zgt-badge--ying text-xs font-medium"
              >应</span
            >
            <span v-else class="text-ink-light text-xs">—</span>
          </td>

          <!-- 爻辞 -->
          <td class="px-2 sm:px-3 py-2.5 text-ink-light text-xs leading-relaxed min-w-[8rem]">
            {{ line.judgment }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { ZhuangGuaLine } from '~/composables/useYijing'
import { wuxingColor as wuxingTextColor } from '~/constants/bazi'

defineProps<{
  lines: ZhuangGuaLine[]
}>()

function sixRelationClass(relation: string): string {
  const map: Record<string, string> = {
    父母: 'sr--parent',
    兄弟: 'sr--sibling',
    官鬼: 'sr--official',
    妻财: 'sr--wealth',
    子孙: 'sr--children',
  }
  return map[relation] || 'sr--default'
}

function sixSpiritClass(spirit: string): string {
  const map: Record<string, string> = {
    青龙: 'ss--qinglong',
    朱雀: 'ss--zhuque',
    勾陈: 'ss--gouchen',
    螣蛇: 'ss--tengshe',
    白虎: 'ss--baihu',
    玄武: 'ss--xuanwu',
  }
  return map[spirit] || 'ss--default'
}
</script>

<style scoped>
/* ── Row striping ── */
.zgt-row {
  border-bottom-color: color-mix(in srgb, var(--color-paper-dark) 50%, transparent);
}

.zgt-row--changing {
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
}

.zgt-row--even {
  background: color-mix(in srgb, var(--color-paper-lightest) 50%, transparent);
}

/* ── Wuxing badge ── */
.zgt-wx-badge {
  color: var(--_wx);
  background: color-mix(in srgb, var(--_wx) 8%, transparent);
}

/* ── Shi/Ying badges ── */
.zgt-badge--shi {
  background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent);
  color: var(--color-cinnabar);
}

.zgt-badge--ying {
  background: color-mix(in srgb, var(--color-gold) 10%, transparent);
  color: var(--color-gold);
}

/* ── Six Relations ── */
.sr--parent {
  background: color-mix(in srgb, var(--color-jade) 10%, transparent);
  color: var(--color-jade);
}
.sr--sibling {
  background: color-mix(in srgb, var(--color-ink-faint) 10%, transparent);
  color: var(--color-ink-light);
}
.sr--official {
  background: color-mix(in srgb, var(--color-gold) 10%, transparent);
  color: var(--color-gold);
}
.sr--wealth {
  background: color-mix(in srgb, var(--color-ink-medium) 10%, transparent);
  color: var(--color-ink);
}
.sr--children {
  background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent);
  color: var(--color-cinnabar);
}
.sr--default {
  background: color-mix(in srgb, var(--color-ink-faint) 10%, transparent);
  color: var(--color-ink-light);
}

/* ── Six Spirits ── */
.ss--qinglong {
  color: var(--color-jade);
}
.ss--zhuque {
  color: var(--color-cinnabar);
}
.ss--gouchen {
  color: var(--color-ink);
}
.ss--tengshe {
  color: var(--color-gold);
}
.ss--baihu {
  color: var(--color-ink-light);
}
.ss--xuanwu {
  color: var(--color-ink-dark);
}
.ss--default {
  color: var(--color-ink-light);
}
</style>
