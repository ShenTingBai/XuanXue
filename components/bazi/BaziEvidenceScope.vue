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
 * 依据与范围（页面 Ⅴ 段「把『我们凭什么』摊开」）。
 *
 * 设计基线：docs/design/2026-09-15-bazi-ui-spec.md §2 Ⅴ 段（密度最高、对比最低）。
 * 依据治理规范 §4.5、§5.6、§16.2 与来源台账 §5 的措辞等级：
 * - 逐条列出来源并标注等级（国家标准 / 政府机构公开数据 / 国家天文机构官方历书 /
 *   古籍在线整理本 / 项目实现工具）；
 * - 限制说明与未输出清单**不得删改**：它们承载本页的准入主张；
 * - 措辞红线：不得出现「国家标准规定八字年柱以立春为界」「古籍明文规定/原典已核验」，
 *   也不得出现任何预测、评分或吉凶等级；
 * - 等级标签用描边 chip，不填色块：等级靠文字表达，不靠颜色强弱；
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
  <details class="bazi-scope-fold card-warm rounded-xl" data-bazi-evidence-scope>
    <!-- 默认收起：来源、限制与「不输出什么」的清单由摘要按钮展开。
         段标题「Ⅴ 依据与范围」由页面承担（此前组件内还有第二个同名 h3，属重复标题，已移除）。 -->
    <summary class="bazi-scope-summary">
      <span class="bazi-fold-mark" aria-hidden="true" />
      <span class="bazi-scope-label bazi-scope-label--closed">
        展开：来源清单、版本、限制说明与本页不输出的内容
      </span>
      <span class="bazi-scope-label bazi-scope-label--open">
        收起：来源清单、版本、限制说明与本页不输出的内容
      </span>
    </summary>

    <div class="bazi-scope-body">
      <h4 class="bazi-subhead">来源清单</h4>
      <ul class="bazi-list">
        <li v-for="source in sources" :key="source.name">
          <span class="bazi-source-name">{{ source.name }}</span>
          <span class="bazi-chip" data-bazi-source-level>{{ source.level }}</span>
          <span class="bazi-source-detail">—— {{ source.detail }}</span>
        </li>
      </ul>

      <h4 class="bazi-subhead">版本</h4>
      <ul class="bazi-list">
        <li>
          规则版本：<span class="editorial-num">{{ ruleVersion }}</span>
        </li>
        <li>
          来源集合版本：<span class="editorial-num">{{ sourceSetVersion }}</span>
        </li>
        <li>
          引擎：{{ engineName }} <span class="editorial-num">{{ engineVersion }}</span>
          （实现工具，不作规则权威）
        </li>
        <li>
          支持范围：公历 <span class="editorial-num">{{ BAZI_SUPPORT_START }}</span> 至查询当日{{
            asOfDate ? `（${asOfDate}）` : ''
          }}
        </li>
        <li>内容标签：本页只使用{{ contentLabels.map(label => `「${label}」`).join('与') }}两类</li>
      </ul>

      <h4 class="bazi-subhead">限制说明</h4>
      <ul class="bazi-list">
        <li v-for="item in limitations" :key="item">{{ item }}</li>
        <li>
          交节时刻已对抽样年份做分钟级核对；国家标准要求的 1
          秒级精度尚未核验，因此边界日的结果可能随精度修正而改变。
        </li>
        <li>
          年柱与月柱的传统规则目前只到古籍在线整理本层级，原刻影印核对尚未完成；「以立春为年界」是本项目采用的传统口径，不是国家标准规定。
        </li>
      </ul>

      <h4 class="bazi-subhead">本页不输出的内容</h4>
      <p class="bazi-list" data-bazi-not-output>
        {{
          notOutput.join('、')
        }}。以上内容本版一律不生成、不展示，也不以「即将推出」等方式承诺时间。
      </p>

      <p class="bazi-foot">
        本页内容为历法换算结果与项目整理的规则说明，不构成任何预测、建议或评价；如需确定性结论，请以权威历书为准。
      </p>
    </div>
  </details>
</template>

<style scoped>
/* Ⅴ 段折叠：默认收起，摘要即按钮（原生 details，键盘可达、无固定 max-height）。 */
.bazi-scope-summary {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 44px;
  padding: 1.25rem 1.5rem;
  border-radius: inherit;
  cursor: pointer;
  list-style: none;
  transition: background var(--transition-fast);
}
.bazi-scope-summary::-webkit-details-marker {
  display: none;
}
.bazi-scope-summary:hover {
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}
.bazi-scope-summary:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
.bazi-scope-label {
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  color: var(--color-ink-dark);
}
.bazi-scope-label--open {
  display: none;
}
details[open] > .bazi-scope-summary .bazi-scope-label--closed {
  display: none;
}
details[open] > .bazi-scope-summary .bazi-scope-label--open {
  display: inline;
}
/* 展开标记：方形 ＋/－，展开后填充朱砂（与三柱卡、六问同一视觉） */
.bazi-fold-mark {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--color-cinnabar);
  border-radius: 3px;
  color: var(--color-cinnabar);
  font-size: 0.75rem;
  line-height: 1;
}
.bazi-fold-mark::before {
  content: '＋';
}
details[open] .bazi-fold-mark {
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
}
details[open] .bazi-fold-mark::before {
  content: '－';
}
.bazi-scope-body {
  padding: 0 1.5rem 1.5rem;
}
/* 展开区第一个小标题不再额外留白（外层已有内边距） */
.bazi-scope-body > .bazi-subhead:first-child {
  margin-top: 0;
}
/* 段落标题：最低对比但可读（正文下限 text-sm） */
.bazi-subhead {
  margin: 24px 0 0;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--color-ink-dark);
}
/* 清单：行高收紧至 1.6，字号不低于 text-sm */
.bazi-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
  overflow-wrap: anywhere;
}
.bazi-list > li + li {
  margin-top: 6px;
}
/* 等级标签：金描边 chip，不填色块 */
.bazi-chip {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border: 1px solid color-mix(in srgb, var(--color-gold) 45%, transparent);
  border-radius: 4px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-gold);
  /* 刻意不加 nowrap：等级标签在 200% 文本缩放下必须能折行，
     否则「古籍在线整理本（底本未与影印核对）」这类长标签会把窄屏撑出横向滚动
     （R5-C 真机验收实测：320px + 200% 时 scrollWidth 508 > 320）。 */
  overflow-wrap: anywhere;
}
.bazi-source-name {
  color: var(--color-ink-dark);
}
.bazi-source-detail {
  color: var(--color-ink-medium);
}
.bazi-foot {
  margin: 24px 0 0;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
}
</style>
