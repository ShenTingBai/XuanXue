<script setup lang="ts">
import { computed } from 'vue'
import {
  BAZI_CONTENT_LABELS,
  BAZI_ENGINE_NAME,
  BAZI_ENGINE_VERSION,
  BAZI_LIMITATIONS,
  BAZI_NOT_OUTPUT,
  BAZI_RULE_VERSION,
  BAZI_SOURCE_SET_VERSION,
  BAZI_SUPPORT_START,
} from '~/constants/bazi-rules'
import type { BaziDomainResult } from '~/types/bazi'

/**
 * 依据与范围（页面 Ⅴ 段）：来源、版本、限制说明与未输出内容清单。
 *
 * 依据治理规范 §4.5、§5.6、§16.2 与来源台账 §5 的措辞等级：
 * - 逐条列出来源并标注等级（国家标准 / 政府机构公开数据 / 国家天文机构官方历书 /
 *   古籍在线整理本 / 项目实现工具）；
 * - 限制说明与未输出清单**不得删改**：它们承载本页的准入主张；
 * - 措辞红线：不得出现「国家标准规定八字年柱以立春为界」「古籍明文规定/原典已核验」，
 *   也不得出现任何预测、评分或吉凶等级；
 * - 有结果时用结果自带版本（与服务端快照一致），无结果时用当前常量版本。
 */

const props = defineProps<{
  result?: BaziDomainResult | null
  /** 查询当日（支持范围上界）。 */
  asOfDate: string
}>()

const ruleVersion = computed(() => props.result?.ruleVersion ?? BAZI_RULE_VERSION)
const sourceSetVersion = computed(() => props.result?.sourceSetVersion ?? BAZI_SOURCE_SET_VERSION)
const engineName = computed(() => props.result?.engineName ?? BAZI_ENGINE_NAME)
const engineVersion = computed(() => props.result?.engineVersion ?? BAZI_ENGINE_VERSION)
const limitations = computed(() => props.result?.limitations ?? [...BAZI_LIMITATIONS])
const notOutput = computed(() => props.result?.notOutput ?? [...BAZI_NOT_OUTPUT])
const contentLabels = computed(() => props.result?.contentLabels ?? [...BAZI_CONTENT_LABELS])

/** 来源清单：逐条给出等级，等级用文字标注而不只靠样式。 */
const sources = [
  {
    name: 'GB/T 33661—2017《农历的编算和颁行》',
    level: '国家标准',
    detail:
      '干支纪年锚点（§6.1.1）、干支纪日锚点（§6.3.2）、十二「节」与太阳视黄经（规范性附录 A）、计算精度要求（§5.2）。',
  },
  {
    name: '中国香港天文台《公历与农历对照表》',
    level: '政府机构公开数据',
    detail: '1901—2100 年逐日的公历、农历与节气日期对照，用于核对交节日。',
  },
  {
    name: '日本国立天文台《暦要項》二十四节气',
    level: '国家天文机构官方历书',
    detail: '交节时刻（日本标准时间），换算为北京时间后与实现结果逐项核对。',
  },
  {
    name: '《三命通会》卷二·论遁月时、卷二·论四时节气',
    level: '古籍在线整理本（底本未与影印核对）',
    detail: '五虎遁（月干由年干推得）与「节」为月界、立春为年界的传统规则依据。',
  },
  {
    name: '《三命通会》卷二·论天干阴阳生死、《五行大义》卷二·第五论配支干',
    level: '沿用生肖阶段已核验来源',
    detail: '天干与地支的五行分类，本页直接复用，不重新定义。',
  },
  {
    name: `${BAZI_ENGINE_NAME} ${BAZI_ENGINE_VERSION}`,
    level: '项目实现工具（不作规则权威）',
    detail: '仅用于历法换算与节气时刻计算；规则与口径以上列来源为准。',
  },
]
</script>

<template>
  <section
    class="card-warm rounded-xl p-6 sm:p-8"
    data-bazi-evidence-scope
    aria-labelledby="bazi-scope-heading"
  >
    <h3 id="bazi-scope-heading" class="font-display text-lg text-ink-dark">依据与范围</h3>

    <h4 class="mt-4 font-sans text-sm text-ink-dark">来源清单</h4>
    <ul class="mt-2 space-y-2 font-sans text-xs text-ink-medium leading-relaxed">
      <li v-for="source in sources" :key="source.name">
        · {{ source.name }}
        <span class="text-ink-light">［{{ source.level }}］</span>
        —— {{ source.detail }}
      </li>
    </ul>

    <h4 class="mt-5 font-sans text-sm text-ink-dark">版本</h4>
    <ul class="mt-2 space-y-1 font-sans text-xs text-ink-medium leading-relaxed">
      <li>· 规则版本：{{ ruleVersion }}</li>
      <li>· 来源集合版本：{{ sourceSetVersion }}</li>
      <li>· 引擎：{{ engineName }} {{ engineVersion }}（实现工具，不作规则权威）</li>
      <li>
        · 支持范围：公历 {{ BAZI_SUPPORT_START }} 至查询当日{{ asOfDate ? `（${asOfDate}）` : '' }}
      </li>
      <li>· 内容标签：本页只使用{{ contentLabels.map(label => `「${label}」`).join('与') }}两类</li>
    </ul>

    <h4 class="mt-5 font-sans text-sm text-ink-dark">限制说明</h4>
    <ul class="mt-2 space-y-1.5 font-sans text-xs text-ink-medium leading-relaxed">
      <li v-for="item in limitations" :key="item">· {{ item }}</li>
      <li>
        · 交节时刻已对抽样年份做分钟级核对；国家标准要求的 1
        秒级精度尚未核验，因此边界日的结果可能随精度修正而改变。
      </li>
      <li>
        ·
        年柱与月柱的传统规则目前只到古籍在线整理本层级，原刻影印核对尚未完成；「以立春为年界」是本项目采用的传统口径，不是国家标准规定。
      </li>
    </ul>

    <h4 class="mt-5 font-sans text-sm text-ink-dark">本页不输出的内容</h4>
    <p class="mt-2 font-sans text-xs text-ink-medium leading-relaxed" data-bazi-not-output>
      {{ notOutput.join('、') }}。以上内容本版一律不生成、不展示，也不以「即将推出」等方式承诺时间。
    </p>

    <p class="mt-5 font-sans text-xs text-ink-light leading-relaxed">
      本页内容为历法换算结果与项目整理的规则说明，不构成任何预测、建议或评价；如需确定性结论，请以权威历书为准。
    </p>
  </section>
</template>
