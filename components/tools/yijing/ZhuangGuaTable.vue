<template>
  <div class="overflow-x-auto -mx-4 sm:mx-0">
    <table class="w-full text-sm font-sans border-collapse" aria-label="纳甲装卦详表">
      <thead>
        <tr class="bg-paper-dark">
          <th scope="col" class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap">爻位</th>
          <th scope="col" class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap" title="天干地支配卦">纳甲</th>
          <th scope="col" class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap" title="此爻地支所属五行">五行</th>
          <th scope="col" class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap" title="爻与日主的关系：父母主文书、兄弟主竞争、官鬼主事业、妻财主财运、子孙主福神">六亲</th>
          <th scope="col" class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap" title="当日值日之神：青龙主喜、朱雀主口舌、勾陈主田土、螣蛇主虚惊、白虎主刑伤、玄武主暗昧">六神</th>
          <th scope="col" class="px-2 sm:px-3 py-2 text-center text-xs text-ink tracking-wider whitespace-nowrap" title="世为自己，应为对方">世应</th>
          <th scope="col" class="px-2 sm:px-3 py-2 text-left text-xs text-ink tracking-wider whitespace-nowrap">爻辞</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(line, idx) in lines"
          :key="line.position"
          :class="[
            'border-b border-paper-dark/50 transition-colors',
            line.yao.isChanging ? 'bg-cinnabar/5' : idx % 2 === 0 ? 'bg-paper-lightest/50' : 'bg-transparent',
          ]"
        >
          <!-- 爻位 -->
          <td class="px-2 sm:px-3 py-2.5 whitespace-nowrap">
            <span
              class="font-medium"
              :class="{ 'text-cinnabar': line.yao.isChanging }"
            >
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
              class="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
              :style="{ color: wuxingTextColor(line.branchWuxing), backgroundColor: wuxingBgColor(line.branchWuxing) }"
            >
              {{ line.branchWuxing }}
            </span>
          </td>

          <!-- 六亲 -->
          <td class="px-2 sm:px-3 py-2.5 whitespace-nowrap">
            <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" :class="sixRelationClass(line.sixRelation)">
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
            <span v-if="line.isShi" class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cinnabar/10 text-cinnabar text-xs font-medium">世</span>
            <span v-else-if="line.isYing" class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold/10 text-gold text-xs font-medium">应</span>
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
import { wuxingColor as wuxingTextColor, hexToRgba } from '~/constants/bazi'

defineProps<{
  lines: ZhuangGuaLine[]
}>()

function wuxingBgColor(wuxing: string): string {
  const color = wuxingTextColor(wuxing)
  return hexToRgba(color, 0.08)
}

function sixRelationClass(relation: string): string {
  const map: Record<string, string> = {
    '父母': 'bg-jade/10 text-jade',
    '兄弟': 'bg-ink-faint/10 text-ink-light',
    '官鬼': 'bg-gold/10 text-gold',
    '妻财': 'bg-ink-medium/10 text-ink',
    '子孙': 'bg-cinnabar/10 text-cinnabar',
  }
  return map[relation] || 'bg-ink-faint/10 text-ink-light'
}

function sixSpiritClass(spirit: string): string {
  const map: Record<string, string> = {
    '青龙': 'text-jade',
    '朱雀': 'text-cinnabar',
    '勾陈': 'text-ink',
    '螣蛇': 'text-gold',
    '白虎': 'text-ink-light',
    '玄武': 'text-ink-dark',
  }
  return map[spirit] || 'text-ink-light'
}
</script>
