<script setup lang="ts">
/**
 * 「怎样看懂这张盘」（页面 Ⅳ 段）：契约 §17 六问 + 三层结构。
 *
 * 设计基线：docs/design/2026-09-15-bazi-ui-spec.md §2 Ⅳ 段（六问 · 三层折叠）。
 * 组织方式（治理规范 §14）：
 * - 六问固定覆盖：干支、年柱、月柱（为何以「节」为界）、日柱与日干、边界候选为何不确定、缺时柱意味着什么；
 * - 三层：第一层一句白话（summary 可见）→ 第二层计算说明 → 第三层来源与规则版本（展开区末行）；
 * - 每个术语都答同一组问题：用户得到什么 → 怎样算或查 → 在本页的作用 → 不代表什么 → 用了哪版规则与来源；
 * - 原生 `details` 折叠，**不使用固定 max-height**；不使用浮动「注」按钮或覆盖式说明。
 *
 * 措辞红线（来源台账 §5）：年柱以「立春」为界是**传统规则并由本项目采用**，
 * 不是国家标准规定；传统规则目前只到古籍在线整理本层级，原刻影印核对尚未完成。
 */

interface GuideItem {
  id: string
  question: string
  /** 第一层：一句白话。 */
  plain: string
  /** 第二层：怎样算或查、在本页的作用、不代表什么。 */
  detail: string[]
  /** 第三层：规则与来源（必须如实标注等级）。 */
  source: string
}

const items: GuideItem[] = [
  {
    id: 'ganzhi',
    question: '干支是什么？',
    plain:
      '天干十个字（甲乙丙丁戊己庚辛壬癸）、地支十二个字（子丑寅卯辰巳午未申酉戌亥），两两相配成六十组，用来给年、月、日编号。',
    detail: [
      '怎样查：天干按顺序循环，地支按顺序循环，六十次一循环；本页按日期与节气边界查出对应的一组。',
      '在本页的作用：三柱的每一个字都是干支；五行标注只是给这两个字附上传统分类。',
      '不代表什么：干支是传统计数与分类符号，不代表能力、性格或任何现实结果。',
    ],
    source:
      '来源：天干地支与六十甲子为通行历法事实；干支五行分类沿用生肖阶段已核验来源（《三命通会》卷二·论天干阴阳生死、《五行大义》卷二·第五论配支干）。规则版本见 Ⅴ 段。',
  },
  {
    id: 'year',
    question: '年柱是怎么定的？为什么有的年份要按「立春」算？',
    plain:
      '年柱是干支纪年里的那一组。传统八字以「立春」为年界，本页采用这一传统规则；而农历的干支年以正月初一为界，两者可能落在不同年份。',
    detail: [
      '怎样算：以公历 1984 年为甲子年（国家标准给出的干支纪年锚点），按六十甲子顺推；但年界取「立春」，而不是正月初一。',
      '在本页的作用：决定年柱的两个字，并进一步决定月柱的天干。',
      '不代表什么：年柱不是生肖，也不能用来判断个人命运；本页不给任何预测。',
    ],
    source:
      '来源：干支纪年锚点取自 GB/T 33661—2017《农历的编算和颁行》（国家标准）§6.1.1；「以立春为年界」是传统规则，由《三命通会》卷二·论遁月时（遁月从年）与二十四节气定义推出并由本项目采用——国家标准规定的是农历干支年以正月初一交替，并未规定八字年柱口径。传统规则载体目前为古籍在线整理本，原刻影印核对尚未完成。',
  },
  {
    id: 'month',
    question: '月柱为什么按「节」切，而不是按农历月份？',
    plain:
      '月柱的地支由十二个「节」决定（立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒），而不是按农历初一换月。',
    detail: [
      '怎样算：先看出生日期落在哪两个「节」之间，得到月支；月干由年干按五虎遁推出（甲己之年丙作首，乙庚之岁戊为头，丙辛之岁寻庚上，丁壬壬位顺行流，戊癸之年甲寅求）。',
      '在本页的作用：决定月柱的两个字，并说明为什么同一天可能出现两种月柱。',
      '不代表什么：这里的「节」只用于确定月支，不是节气民俗，也不代表任何运势起伏。',
    ],
    source:
      '来源：黄经与十二「节」对应取自 GB/T 33661—2017 规范性附录 A；交节日期取中国香港天文台《公历与农历对照表》（政府机构公开数据），交节时刻取日本国立天文台《暦要項》二十四节气（国家天文机构官方历书）；五虎遁取自《三命通会》卷二·论遁月时古歌（古籍在线整理本）。',
  },
  {
    id: 'day',
    question: '日柱与「日干」是什么？',
    plain:
      '日柱是出生当天的干支，由六十甲子纪日连续排下来，不受节气影响。日柱的天干叫「日干」，传统体系里也称「日主」。',
    detail: [
      '怎样算：以北京时间 1949 年 10 月 1 日为甲子日（国家标准给出的干支纪日锚点），按日数推出目标日的干支；换日以民用午夜为准。',
      '在本页的作用：日干是本页唯一单独标出的字（主标签用「日干」，首现时说明它亦称「日主」）。',
      '不代表什么：本页不解读日干强弱，也不做任何据此展开的推断——这些都属于本版不输出的内容。',
    ],
    source:
      '来源：干支纪日锚点取自 GB/T 33661—2017 §6.3.2（国家标准）；「日主」称谓见八字工具契约 §13，本页主用「日干」（交付规范 §7.1 用字）。',
  },
  {
    id: 'candidate',
    question: '为什么有时会同时给出两种年柱、月柱？',
    plain:
      '如果你填的日期正好是某个「节」的交节当天，而我们知道的信息里没有出生时刻，就无法判断出生在交节之前还是之后，因此年柱、月柱各有一种可能。',
    detail: [
      '怎样算：本页列出两个完整情形，各自给出整组年柱与月柱，并写明原因（如「立春前（当日 00:00 至 04:02）」）。',
      '在本页的作用：把不确定的部分如实摊开，而不是替你选一个；日柱只由日期决定，所以仍然唯一。',
      '不代表什么：两种情形不是「好坏两种命运」，只是同一时刻规则下的两个技术分支。',
    ],
    source:
      '来源：立春同时影响年柱与月柱，其余「节」只影响月柱；交节时刻精度为分钟级（来源同月柱），国家标准要求的 1 秒级精度尚未核验。',
  },
  {
    id: 'hour',
    question: '没有时柱，会少掉什么？',
    plain:
      '时柱需要出生时刻，本版只依据出生日期，因此不生成时柱。凡是以时柱或出生时刻为前提的内容，本页一律不做。',
    detail: [
      '怎样算：不计算——本页不猜测时辰，也不套用默认时辰。',
      '在本页的作用：完整性写明为「三柱／共四柱」，缺失项固定为时柱。',
      '不代表什么：缺少时柱不影响已给出的三柱与日干，但也不允许据此补任何结论；本页同样不支持 23:00—23:59 的午夜换日与子初换日双候选。',
    ],
    source:
      '来源：交付规范 §7.1 首批输出为闭集，仅含公历农历对照与年柱、月柱、日柱、日干、基础五行；时柱属未输出内容（同 Ⅴ 段清单）。',
  },
]
</script>

<template>
  <section
    class="card-warm rounded-xl p-6 sm:p-8"
    data-bazi-reading-guide
    aria-labelledby="bazi-guide-detail-heading"
  >
    <h3 id="bazi-guide-detail-heading" class="font-display text-lg text-ink-dark">
      怎样看懂这张盘
    </h3>
    <p class="mt-2 font-sans text-sm leading-relaxed text-ink-medium">
      六个问题，每个都按同一组顺序回答：你得到什么 → 怎样算或查 → 在本页的作用 → 不代表什么 →
      用了哪版规则与来源。默认只显示一句白话，需要计算细节时再展开。
    </p>

    <div class="mt-4 space-y-3">
      <details v-for="item in items" :key="item.id" class="bazi-guide-item">
        <!-- 第一层：问题 + 一句白话 -->
        <summary class="bazi-guide-summary">
          <span class="bazi-fold-mark" aria-hidden="true" />
          <span class="bazi-guide-head">
            <span class="bazi-layer">第一层 · 白话</span>
            <span class="bazi-guide-question">{{ item.question }}</span>
            <span class="bazi-guide-plain">{{ item.plain }}</span>
          </span>
        </summary>

        <div class="bazi-guide-body">
          <!-- 第二层：怎么算 / 在本页的作用 / 不代表什么 -->
          <p class="bazi-layer bazi-layer--inner">第二层 · 计算说明</p>
          <p v-for="line in item.detail" :key="line" class="bazi-guide-line">{{ line }}</p>

          <!-- 第三层：来源与规则版本 -->
          <p class="bazi-layer bazi-layer--inner bazi-layer--top">第三层 · 来源与规则版本</p>
          <p class="bazi-guide-line">{{ item.source }}</p>
        </div>
      </details>
    </div>
  </section>
</template>

<style scoped>
.bazi-guide-item {
  border: 1px solid var(--color-paper-dark);
  border-radius: 10px;
  padding: 12px 14px;
}
/* 六问摘要：补上可展开标记（此前完全没有可视线索）；标记形状 + 悬停底色一起表达可点。
   摘要改 flex 两列（标记 + 原三行头区），三层结构与文案不变。 */
.bazi-guide-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  min-height: 44px;
  padding: 6px 8px;
  margin: -6px -8px 0;
  border-radius: 6px;
  cursor: pointer;
  list-style: none;
  transition: background var(--transition-fast);
}
.bazi-guide-summary::-webkit-details-marker {
  display: none;
}
.bazi-guide-summary:hover {
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}
.bazi-guide-head {
  min-width: 0;
}
.bazi-fold-mark {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  margin-top: 0.15rem;
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
.bazi-guide-summary:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
/* 层级标签：小字 + 中性色，承担「这三层是什么」的说明，不是装饰 */
.bazi-layer {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  color: var(--color-ink-medium);
}
.bazi-layer--inner {
  margin: 0 0 6px;
}
.bazi-layer--top {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--color-paper-dark);
}
.bazi-guide-question {
  display: block;
  margin-top: 2px;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  color: var(--color-ink-dark);
}
.bazi-guide-plain {
  display: block;
  margin-top: 4px;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--color-ink-medium);
}
/* 展开区：每层左缩进 16px；不使用固定 max-height */
.bazi-guide-body {
  margin-top: 12px;
  padding-left: 16px;
}
.bazi-guide-line {
  margin: 0 0 6px;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--color-ink-medium);
}
</style>
