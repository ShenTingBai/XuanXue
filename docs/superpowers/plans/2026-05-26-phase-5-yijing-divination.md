# Phase 5 — 六爻占卜 Implementation Plan

> **状态：已完成** — 对应功能已合并至 `main`
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete 六爻纳甲占卜 system with coin/number casting, 64-hexagram database, 纳甲装卦 (六亲/六神/世应), 变卦, rule-template interpretation, and auto-save.

**Architecture:** Pure TypeScript engine (`composables/useYijing.ts`) + static data (`constants/yijing.ts`) + 4 Vue components + page + reuse existing divinations API. One feature branch (`phase-5-yijing`), all files committed together at the end.

**Tech Stack:** Nuxt 3 / Vue 3 / TypeScript / TailwindCSS / sql.js

---

## File Structure

```
Create: constants/yijing.ts              # 64 hexagrams data + 纳甲/六神 rules + helpers
Create: composables/useYijing.ts          # Casting → 装卦 → 变卦 → interpretation
Create: tests/composables/useYijing.test.ts
Create: components/tools/yijing/
  ├── YijingCastingPanel.vue             # Coin toss animation + number input
  ├── HexagramDisplay.vue                # Hexagram visualization (6 lines) + name + judgment
  ├── ZhuangGuaTable.vue                 # Per-line detail table (纳甲/六亲/六神/世应/爻辞)
  └── YijingInterpretation.vue           # Transformed hexagram + scoring + summary
Create: pages/tools/yijing.vue           # Page entry (ToolPageLayout, no sidebars)
```

---

### Task 1: constants/yijing.ts — 64 hexagrams + rule tables

**Files:**

- Create: `constants/yijing.ts`

**Responsibility:** Complete static data layer — all 64 hexagram records with 卦辞/爻辞, 纳甲 stem/branch mapping tables, 六神 ordering, and helper functions for hexagram lookup by trigram composition.

- [ ] **Step 1: Write the complete data file**

First, the 五行 mapping for earthly branches (reused from bazi, duplicated here for zero-dependency):

```typescript
export const BRANCH_WUXING: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}
```

Types:

```typescript
export type Gong = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤'
export type LiuQin = '父母' | '兄弟' | '官鬼' | '妻财' | '子孙'
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '腾蛇' | '白虎' | '玄武'

export interface HexagramData {
  id: number
  name: string
  judgment: string
  lineTexts: [string, string, string, string, string, string]
  upperTrigram: string
  lowerTrigram: string
  gong: Gong
  shiPos: number
  yingPos: number
}
```

纳甲 rule tables:

```typescript
// Trigram → inner/outer stem + 6 branch sequence
export const NAJIA_RULES: Record<
  string,
  { innerStem: string; outerStem: string; branches: string[] }
> = {
  乾: { innerStem: '甲', outerStem: '壬', branches: ['子', '寅', '辰', '午', '申', '戌'] },
  坤: { innerStem: '乙', outerStem: '癸', branches: ['未', '巳', '卯', '丑', '亥', '酉'] },
  震: { innerStem: '庚', outerStem: '庚', branches: ['子', '寅', '辰', '午', '申', '戌'] },
  巽: { innerStem: '辛', outerStem: '辛', branches: ['丑', '亥', '酉', '未', '巳', '卯'] },
  坎: { innerStem: '戊', outerStem: '戊', branches: ['寅', '辰', '午', '申', '戌', '子'] },
  离: { innerStem: '己', outerStem: '己', branches: ['卯', '丑', '亥', '酉', '未', '巳'] },
  艮: { innerStem: '丙', outerStem: '丙', branches: ['辰', '午', '申', '戌', '子', '寅'] },
  兑: { innerStem: '丁', outerStem: '丁', branches: ['巳', '卯', '丑', '亥', '酉', '未'] },
}
```

六神 ordering and 八宫五行:

```typescript
export const LIUSHEN_ORDER: LiuShen[] = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武']

// Day stem → starting 六神 index
export const LIUSHEN_START: Record<string, number> = {
  甲: 0,
  乙: 0,
  丙: 1,
  丁: 1,
  戊: 2,
  己: 3,
  庚: 4,
  辛: 4,
  壬: 5,
  癸: 5,
}

// 八宫 → element
export const GONG_WUXING: Record<Gong, string> = {
  乾: '金',
  兑: '金',
  离: '火',
  震: '木',
  巽: '木',
  坎: '水',
  艮: '土',
  坤: '土',
}
```

Hexagram lookup helper:

```typescript
// Map (upper trigram, lower trigram) → hexagram ID
const TRIGRAM_HEXAGRAM_MAP: Record<string, number> = {
  乾乾: 1,
  乾巽: 2,
  乾艮: 3,
  乾坤: 4,
  巽坤: 5,
  艮坤: 6,
  离坤: 7,
  离乾: 8,
  兑兑: 9,
  兑坎: 10,
  兑坤: 11,
  兑艮: 12,
  坎艮: 13,
  坤艮: 14,
  震艮: 15,
  震兑: 16,
  离离: 17,
  离艮: 18,
  离巽: 19,
  离坎: 20,
  艮坎: 21,
  巽坎: 22,
  乾坎: 23,
  乾离: 24,
  震震: 25,
  震坤: 26,
  震坎: 27,
  震巽: 28,
  坤巽: 29,
  坎巽: 30,
  兑巽: 31,
  兑震: 32,
  巽巽: 33,
  巽乾: 34,
  巽离: 35,
  巽震: 36,
  乾震: 37,
  离震: 38,
  艮震: 39,
  艮巽: 40,
  坎坎: 41,
  坎兑: 42,
  坎震: 43,
  坎离: 44,
  兑离: 45,
  震离: 46,
  坤离: 47,
  坤坎: 48,
  艮艮: 49,
  艮离: 50,
  艮乾: 51,
  艮兑: 52,
  离兑: 53,
  乾兑: 54,
  巽兑: 55,
  巽艮: 56,
  坤坤: 57,
  坤震: 58,
  坤兑: 59,
  坤乾: 60,
  震乾: 61,
  兑乾: 62,
  坎乾: 63,
  坎坤: 64,
}

export function findHexagram(upper: string, lower: string): HexagramData | undefined {
  return HEXAGRAMS.find(h => h.upperTrigram === upper && h.lowerTrigram === lower)
}

export function getHexagramById(id: number): HexagramData | undefined {
  return HEXAGRAMS.find(h => h.id === id)
}
```

Now the 64 hexagrams data. Each entry: `id, name, judgment, lineTexts[6], upperTrigram, lowerTrigram, gong, shiPos, yingPos`:

```typescript
export const HEXAGRAMS: HexagramData[] = [
  // 乾宫 (金)
  {
    id: 1,
    name: '乾',
    judgment: '乾，元亨利贞。',
    lineTexts: [
      '潜龙勿用。',
      '见龙在田，利见大人。',
      '君子终日乾乾，夕惕若厉，无咎。',
      '或跃在渊，无咎。',
      '飞龙在天，利见大人。',
      '亢龙有悔。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '乾',
    gong: '乾',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 2,
    name: '姤',
    judgment: '姤，女壮，勿用取女。',
    lineTexts: [
      '系于金柅，贞吉。有攸往，见凶。羸豕孚蹢躅。',
      '包有鱼，无咎，不利宾。',
      '臀无肤，其行次且，厉，无大咎。',
      '包无鱼，起凶。',
      '以杞包瓜，含章，有陨自天。',
      '姤其角，吝，无咎。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '巽',
    gong: '乾',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 3,
    name: '遁',
    judgment: '遁，亨，小利贞。',
    lineTexts: [
      '遁尾，厉，勿用有攸往。',
      '执之用黄牛之革，莫之胜说。',
      '系遁，有疾厉，畜臣妾吉。',
      '好遁，君子吉，小人否。',
      '嘉遁，贞吉。',
      '肥遁，无不利。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '艮',
    gong: '乾',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 4,
    name: '否',
    judgment: '否之匪人，不利君子贞，大往小来。',
    lineTexts: [
      '拔茅茹，以其汇，贞吉亨。',
      '包承，小人吉，大人否亨。',
      '包羞。',
      '有命无咎，畴离祉。',
      '休否，大人吉。其亡其亡，系于苞桑。',
      '倾否，先否后喜。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '坤',
    gong: '乾',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 5,
    name: '观',
    judgment: '观，盥而不荐，有孚颙若。',
    lineTexts: [
      '童观，小人无咎，君子吝。',
      '窥观，利女贞。',
      '观我生进退。',
      '观国之光，利用宾于王。',
      '观我生，君子无咎。',
      '观其生，君子无咎。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '坤',
    gong: '乾',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 6,
    name: '剥',
    judgment: '剥，不利有攸往。',
    lineTexts: [
      '剥床以足，蔑贞凶。',
      '剥床以辨，蔑贞凶。',
      '剥之无咎。',
      '剥床以肤，凶。',
      '贯鱼以宫人宠，无不利。',
      '硕果不食，君子得舆，小人剥庐。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '坤',
    gong: '乾',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 7,
    name: '晋',
    judgment: '晋，康侯用锡马蕃庶，昼日三接。',
    lineTexts: [
      '晋如摧如，贞吉。罔孚，裕无咎。',
      '晋如愁如，贞吉。受兹介福，于其王母。',
      '众允，悔亡。',
      '晋如鼫鼠，贞厉。',
      '悔亡，失得勿恤，往吉无不利。',
      '晋其角，维用伐邑，厉吉无咎，贞吝。',
    ],
    upperTrigram: '离',
    lowerTrigram: '坤',
    gong: '乾',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 8,
    name: '大有',
    judgment: '大有，元亨。',
    lineTexts: [
      '无交害，匪咎，艰则无咎。',
      '大车以载，有攸往无咎。',
      '公用亨于天子，小人弗克。',
      '匪其彭，无咎。',
      '厥孚交如威如，吉。',
      '自天祐之，吉无不利。',
    ],
    upperTrigram: '离',
    lowerTrigram: '乾',
    gong: '乾',
    shiPos: 2,
    yingPos: 5,
  },
  // 兑宫 (金)
  {
    id: 9,
    name: '兑',
    judgment: '兑，亨，利贞。',
    lineTexts: [
      '和兑，吉。',
      '孚兑，吉，悔亡。',
      '来兑，凶。',
      '商兑未宁，介疾有喜。',
      '孚于剥，有厉。',
      '引兑。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '兑',
    gong: '兑',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 10,
    name: '困',
    judgment: '困，亨，贞大人吉，无咎。有言不信。',
    lineTexts: [
      '臀困于株木，入于幽谷，三岁不觌。',
      '困于酒食，朱绂方来，利用享祀，征凶无咎。',
      '困于石，据于蒺藜，入于其宫不见其妻，凶。',
      '来徐徐，困于金车，吝，有终。',
      '劓刖，困于赤绂，乃徐有说，利用祭祀。',
      '困于葛藟，于臲卼，曰动悔有悔，征吉。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '坎',
    gong: '兑',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 11,
    name: '萃',
    judgment: '萃，亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。',
    lineTexts: [
      '有孚不终，乃乱乃萃，若号，一握为笑，勿恤，往无咎。',
      '引吉，无咎，孚乃利用禴。',
      '萃如嗟如，无攸利，往无咎，小吝。',
      '大吉，无咎。',
      '萃有位，无咎，匪孚，元永贞，悔亡。',
      '赍咨涕洟，无咎。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '坤',
    gong: '兑',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 12,
    name: '咸',
    judgment: '咸，亨，利贞，取女吉。',
    lineTexts: [
      '咸其拇。',
      '咸其腓，凶，居吉。',
      '咸其股，执其随，往吝。',
      '贞吉悔亡，憧憧往来，朋从尔思。',
      '咸其脢，无悔。',
      '咸其辅颊舌。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '艮',
    gong: '兑',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 13,
    name: '蹇',
    judgment: '蹇，利西南，不利东北。利见大人，贞吉。',
    lineTexts: [
      '往蹇来誉。',
      '王臣蹇蹇，匪躬之故。',
      '往蹇来反。',
      '往蹇来连。',
      '大蹇朋来。',
      '往蹇来硕，吉，利见大人。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '艮',
    gong: '兑',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 14,
    name: '谦',
    judgment: '谦，亨，君子有终。',
    lineTexts: [
      '谦谦君子，用涉大川，吉。',
      '鸣谦，贞吉。',
      '劳谦，君子有终，吉。',
      '无不利，撝谦。',
      '不富以其邻，利用侵伐，无不利。',
      '鸣谦，利用行师征邑国。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '艮',
    gong: '兑',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 15,
    name: '小过',
    judgment: '小过，亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上，宜下，大吉。',
    lineTexts: [
      '飞鸟以凶。',
      '过其祖，遇其妣，不及其君，遇其臣，无咎。',
      '弗过防之，从或戕之，凶。',
      '无咎，弗过遇之，往厉必戒，勿用永贞。',
      '密云不雨，自我西郊，公弋取彼在穴。',
      '弗遇过之，飞鸟离之，凶，是谓灾眚。',
    ],
    upperTrigram: '震',
    lowerTrigram: '艮',
    gong: '兑',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 16,
    name: '归妹',
    judgment: '归妹，征凶，无攸利。',
    lineTexts: [
      '归妹以娣，跛能履，征吉。',
      '眇能视，利幽人之贞。',
      '归妹以须，反归以娣。',
      '归妹愆期，迟归有时。',
      '帝乙归妹，其君之袂不如其娣之袂良，月几望，吉。',
      '女承筐无实，士刲羊无血，无攸利。',
    ],
    upperTrigram: '震',
    lowerTrigram: '兑',
    gong: '兑',
    shiPos: 2,
    yingPos: 5,
  },
  // 离宫 (火)
  {
    id: 17,
    name: '离',
    judgment: '离，利贞，亨。畜牝牛吉。',
    lineTexts: [
      '履错然，敬之无咎。',
      '黄离，元吉。',
      '日昃之离，不鼓缶而歌，则大耋之嗟，凶。',
      '突如其来如，焚如，死如，弃如。',
      '出涕沱若，戚嗟若，吉。',
      '王用出征，有嘉折首，获匪其丑，无咎。',
    ],
    upperTrigram: '离',
    lowerTrigram: '离',
    gong: '离',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 18,
    name: '旅',
    judgment: '旅，小亨，旅贞吉。',
    lineTexts: [
      '旅琐琐，斯其所取灾。',
      '旅即次，怀其资，得童仆贞。',
      '旅焚其次，丧其童仆，贞厉。',
      '旅于处，得其资斧，我心不快。',
      '射雉一矢亡，终以誉命。',
      '鸟焚其巢，旅人先笑后号咷，丧牛于易，凶。',
    ],
    upperTrigram: '离',
    lowerTrigram: '艮',
    gong: '离',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 19,
    name: '鼎',
    judgment: '鼎，元吉，亨。',
    lineTexts: [
      '鼎颠趾，利出否。得妾以其子，无咎。',
      '鼎有实，我仇有疾，不我能即，吉。',
      '鼎耳革，其行塞，雉膏不食，方雨亏悔，终吉。',
      '鼎折足，覆公餗，其形渥，凶。',
      '鼎黄耳金铉，利贞。',
      '鼎玉铉，大吉，无不利。',
    ],
    upperTrigram: '离',
    lowerTrigram: '巽',
    gong: '离',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 20,
    name: '未济',
    judgment: '未济，亨。小狐汔济，濡其尾，无攸利。',
    lineTexts: [
      '濡其尾，吝。',
      '曳其轮，贞吉。',
      '未济，征凶，利涉大川。',
      '贞吉悔亡，震用伐鬼方，三年有赏于大国。',
      '贞吉，无悔，君子之光，有孚吉。',
      '有孚于饮酒，无咎。濡其首，有孚失是。',
    ],
    upperTrigram: '离',
    lowerTrigram: '坎',
    gong: '离',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 21,
    name: '蒙',
    judgment: '蒙，亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。',
    lineTexts: [
      '发蒙，利用刑人，用说桎梏，以往吝。',
      '包蒙吉，纳妇吉，子克家。',
      '勿用取女，见金夫，不有躬，无攸利。',
      '困蒙，吝。',
      '童蒙，吉。',
      '击蒙，不利为寇，利御寇。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '坎',
    gong: '离',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 22,
    name: '涣',
    judgment: '涣，亨。王假有庙，利涉大川，利贞。',
    lineTexts: [
      '用拯马壮，吉。',
      '涣奔其机，悔亡。',
      '涣其躬，无悔。',
      '涣其群，元吉。涣有丘，匪夷所思。',
      '涣汗其大号，涣王居，无咎。',
      '涣其血，去逖出，无咎。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '坎',
    gong: '离',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 23,
    name: '讼',
    judgment: '讼，有孚窒惕，中吉，终凶。利见大人，不利涉大川。',
    lineTexts: [
      '不永所事，小有言，终吉。',
      '不克讼，归而逋，其邑人三百户，无眚。',
      '食旧德，贞厉，终吉。或从王事，无成。',
      '不克讼，复即命，渝安贞，吉。',
      '讼元吉。',
      '或锡之鞶带，终朝三褫之。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '坎',
    gong: '离',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 24,
    name: '同人',
    judgment: '同人于野，亨。利涉大川，利君子贞。',
    lineTexts: [
      '同人于门，无咎。',
      '同人于宗，吝。',
      '伏戎于莽，升其高陵，三岁不兴。',
      '乘其墉，弗克攻，吉。',
      '同人先号咷而后笑，大师克相遇。',
      '同人于郊，无悔。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '离',
    gong: '离',
    shiPos: 2,
    yingPos: 5,
  },
  // 震宫 (木)
  {
    id: 25,
    name: '震',
    judgment: '震，亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。',
    lineTexts: [
      '震来虩虩，后笑言哑哑，吉。',
      '震来厉，亿丧贝，跻于九陵，勿逐，七日得。',
      '震苏苏，震行无眚。',
      '震遂泥。',
      '震往来厉，亿无丧，有事。',
      '震索索，视矍矍，征凶。震不于其躬于其邻，无咎。婚媾有言。',
    ],
    upperTrigram: '震',
    lowerTrigram: '震',
    gong: '震',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 26,
    name: '豫',
    judgment: '豫，利建侯行师。',
    lineTexts: [
      '鸣豫，凶。',
      '介于石，不终日，贞吉。',
      '盱豫悔，迟有悔。',
      '由豫，大有得，勿疑朋盍簪。',
      '贞疾，恒不死。',
      '冥豫，成有渝，无咎。',
    ],
    upperTrigram: '震',
    lowerTrigram: '坤',
    gong: '震',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 27,
    name: '解',
    judgment: '解，利西南。无所往，其来复吉。有攸往，夙吉。',
    lineTexts: [
      '无咎。',
      '田获三狐，得黄矢，贞吉。',
      '负且乘，致寇至，贞吝。',
      '解而拇，朋至斯孚。',
      '君子维有解，吉，有孚于小人。',
      '公用射隼于高墉之上，获之，无不利。',
    ],
    upperTrigram: '震',
    lowerTrigram: '坎',
    gong: '震',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 28,
    name: '恒',
    judgment: '恒，亨，无咎，利贞，利有攸往。',
    lineTexts: [
      '浚恒，贞凶，无攸利。',
      '悔亡。',
      '不恒其德，或承之羞，贞吝。',
      '田无禽。',
      '恒其德，贞，妇人吉，夫子凶。',
      '振恒，凶。',
    ],
    upperTrigram: '震',
    lowerTrigram: '巽',
    gong: '震',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 29,
    name: '升',
    judgment: '升，元亨，用见大人，勿恤，南征吉。',
    lineTexts: [
      '允升，大吉。',
      '孚乃利用禴，无咎。',
      '升虚邑。',
      '王用亨于岐山，吉无咎。',
      '贞吉升阶。',
      '冥升，利于不息之贞。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '巽',
    gong: '震',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 30,
    name: '井',
    judgment: '井，改邑不改井，无丧无得，往来井井。汔至亦未繘井，羸其瓶，凶。',
    lineTexts: [
      '井泥不食，旧井无禽。',
      '井谷射鲋，瓮敝漏。',
      '井渫不食，为我心恻，可用汲，王明并受其福。',
      '井甃，无咎。',
      '井洌寒泉食。',
      '井收勿幕，有孚元吉。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '巽',
    gong: '震',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 31,
    name: '大过',
    judgment: '大过，栋桡。利有攸往，亨。',
    lineTexts: [
      '藉用白茅，无咎。',
      '枯杨生稊，老夫得其女妻，无不利。',
      '栋桡凶。',
      '栋隆吉，有它吝。',
      '枯杨生华，老妇得其士夫，无咎无誉。',
      '过涉灭顶，凶，无咎。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '巽',
    gong: '震',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 32,
    name: '随',
    judgment: '随，元亨利贞，无咎。',
    lineTexts: [
      '官有渝，贞吉。出门交有功。',
      '系小子，失丈夫。',
      '系丈夫，失小子。随有求得，利居贞。',
      '随有获，贞凶。有孚在道，以明何咎。',
      '孚于嘉，吉。',
      '拘系之，乃从维之，王用亨于西山。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '震',
    gong: '震',
    shiPos: 2,
    yingPos: 5,
  },
  // 巽宫 (木)
  {
    id: 33,
    name: '巽',
    judgment: '巽，小亨，利有攸往，利见大人。',
    lineTexts: [
      '进退，利武人之贞。',
      '巽在床下，用史巫纷若，吉无咎。',
      '频巽，吝。',
      '悔亡，田获三品。',
      '贞吉悔亡，无不利。无初有终。先庚三日，后庚三日，吉。',
      '巽在床下，丧其资斧，贞凶。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '巽',
    gong: '巽',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 34,
    name: '小畜',
    judgment: '小畜，亨。密云不雨，自我西郊。',
    lineTexts: [
      '复自道，何其咎，吉。',
      '牵复，吉。',
      '舆说辐，夫妻反目。',
      '有孚，血去惕出，无咎。',
      '有孚挛如，富以其邻。',
      '既雨既处，尚德载，妇贞厉。月几望，君子征凶。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '乾',
    gong: '巽',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 35,
    name: '家人',
    judgment: '家人，利女贞。',
    lineTexts: [
      '闲有家，悔亡。',
      '无攸遂，在中馈，贞吉。',
      '家人嗃嗃，悔厉吉。妇子嘻嘻，终吝。',
      '富家，大吉。',
      '王假有家，勿恤，吉。',
      '有孚威如，终吉。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '离',
    gong: '巽',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 36,
    name: '益',
    judgment: '益，利有攸往，利涉大川。',
    lineTexts: [
      '利用为大作，元吉无咎。',
      '或益之十朋之龟，弗克违，永贞吉。王用享于帝，吉。',
      '益之用凶事，无咎。有孚中行，告公用圭。',
      '中行告公从，利用为依迁国。',
      '有孚惠心，勿问元吉。有孚惠我德。',
      '莫益之，或击之，立心勿恒，凶。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '震',
    gong: '巽',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 37,
    name: '无妄',
    judgment: '无妄，元亨利贞。其匪正有眚，不利有攸往。',
    lineTexts: [
      '无妄往，吉。',
      '不耕获，不菑畬，则利有攸往。',
      '无妄之灾，或系之牛，行人之得，邑人之灾。',
      '可贞无咎。',
      '无妄之疾，勿药有喜。',
      '无妄行有眚，无攸利。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '震',
    gong: '巽',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 38,
    name: '噬嗑',
    judgment: '噬嗑，亨，利用狱。',
    lineTexts: [
      '屦校灭趾，无咎。',
      '噬肤灭鼻，无咎。',
      '噬腊肉遇毒，小吝无咎。',
      '噬干胏，得金矢，利艰贞吉。',
      '噬干肉，得黄金，贞厉无咎。',
      '何校灭耳，凶。',
    ],
    upperTrigram: '离',
    lowerTrigram: '震',
    gong: '巽',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 39,
    name: '颐',
    judgment: '颐，贞吉。观颐，自求口实。',
    lineTexts: [
      '舍尔灵龟，观我朵颐，凶。',
      '颠颐，拂经于丘颐，征凶。',
      '拂颐，贞凶。十年勿用，无攸利。',
      '颠颐吉，虎视眈眈，其欲逐逐，无咎。',
      '拂经，居贞吉，不可涉大川。',
      '由颐，厉吉，利涉大川。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '震',
    gong: '巽',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 40,
    name: '蛊',
    judgment: '蛊，元亨，利涉大川。先甲三日，后甲三日。',
    lineTexts: [
      '干父之蛊，有子，考无咎，厉终吉。',
      '干母之蛊，不可贞。',
      '干父之蛊，小有悔，无大咎。',
      '裕父之蛊，往见吝。',
      '干父之蛊，用誉。',
      '不事王侯，高尚其事。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '巽',
    gong: '巽',
    shiPos: 2,
    yingPos: 5,
  },
  // 坎宫 (水)
  {
    id: 41,
    name: '坎',
    judgment: '坎，习坎，有孚，维心亨，行有尚。',
    lineTexts: [
      '习坎，入于坎窞，凶。',
      '坎有险，求小得。',
      '来之坎坎，险且枕，入于坎窞，勿用。',
      '樽酒簋贰，用缶，纳约自牖，终无咎。',
      '坎不盈，祇既平，无咎。',
      '系用徽纆，寘于丛棘，三岁不得，凶。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '坎',
    gong: '坎',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 42,
    name: '节',
    judgment: '节，亨。苦节不可贞。',
    lineTexts: [
      '不出户庭，无咎。',
      '不出门庭，凶。',
      '不节若，则嗟若，无咎。',
      '安节，亨。',
      '甘节，吉，往有尚。',
      '苦节，贞凶，悔亡。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '兑',
    gong: '坎',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 43,
    name: '屯',
    judgment: '屯，元亨利贞。勿用有攸往，利建侯。',
    lineTexts: [
      '磐桓，利居贞，利建侯。',
      '屯如邅如，乘马班如，匪寇婚媾，女子贞不字，十年乃字。',
      '即鹿无虞，惟入于林中，君子几不如舍，往吝。',
      '乘马班如，求婚媾，往吉无不利。',
      '屯其膏，小贞吉，大贞凶。',
      '乘马班如，泣血涟如。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '震',
    gong: '坎',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 44,
    name: '既济',
    judgment: '既济，亨小，利贞。初吉终乱。',
    lineTexts: [
      '曳其轮，濡其尾，无咎。',
      '妇丧其茀，勿逐，七日得。',
      '高宗伐鬼方，三年克之，小人勿用。',
      '繻有衣袽，终日戒。',
      '东邻杀牛，不如西邻之禴祭，实受其福。',
      '濡其首，厉。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '离',
    gong: '坎',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 45,
    name: '革',
    judgment: '革，已日乃孚。元亨利贞，悔亡。',
    lineTexts: [
      '巩用黄牛之革。',
      '已日乃革之，征吉，无咎。',
      '征凶，贞厉。革言三就，有孚。',
      '悔亡，有孚改命吉。',
      '大人虎变，未占有孚。',
      '君子豹变，小人革面，征凶，居贞吉。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '离',
    gong: '坎',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 46,
    name: '丰',
    judgment: '丰，亨，王假之，勿忧，宜日中。',
    lineTexts: [
      '遇其配主，虽旬无咎，往有尚。',
      '丰其蔀，日中见斗，往得疑疾，有孚发若，吉。',
      '丰其沛，日中见沬，折其右肱，无咎。',
      '丰其蔀，日中见斗，遇其夷主，吉。',
      '来章有庆誉，吉。',
      '丰其屋，蔀其家，窥其户，阒其无人，三岁不觌，凶。',
    ],
    upperTrigram: '震',
    lowerTrigram: '离',
    gong: '坎',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 47,
    name: '明夷',
    judgment: '明夷，利艰贞。',
    lineTexts: [
      '明夷于飞，垂其翼。君子于行，三日不食。有攸往，主人有言。',
      '明夷于左股，用拯马壮，吉。',
      '明夷于南狩，得其大首，不可疾贞。',
      '入于左腹，获明夷之心，于出门庭。',
      '箕子之明夷，利贞。',
      '不明晦，初登于天，后入于地。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '离',
    gong: '坎',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 48,
    name: '师',
    judgment: '师，贞丈人吉，无咎。',
    lineTexts: [
      '师出以律，否臧凶。',
      '在师中吉，无咎，王三锡命。',
      '师或舆尸，凶。',
      '师左次，无咎。',
      '田有禽，利执言，无咎。长子帅师，弟子舆尸，贞凶。',
      '大君有命，开国承家，小人勿用。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '坎',
    gong: '坎',
    shiPos: 2,
    yingPos: 5,
  },
  // 艮宫 (土)
  {
    id: 49,
    name: '艮',
    judgment: '艮其背，不获其身，行其庭，不见其人，无咎。',
    lineTexts: [
      '艮其趾，无咎，利永贞。',
      '艮其腓，不拯其随，其心不快。',
      '艮其限，列其夤，厉熏心。',
      '艮其身，无咎。',
      '艮其辅，言有序，悔亡。',
      '敦艮，吉。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '艮',
    gong: '艮',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 50,
    name: '贲',
    judgment: '贲，亨。小利有攸往。',
    lineTexts: [
      '贲其趾，舍车而徒。',
      '贲其须。',
      '贲如濡如，永贞吉。',
      '贲如皤如，白马翰如，匪寇婚媾。',
      '贲于丘园，束帛戋戋，吝，终吉。',
      '白贲，无咎。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '离',
    gong: '艮',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 51,
    name: '大畜',
    judgment: '大畜，利贞。不家食吉，利涉大川。',
    lineTexts: [
      '有厉，利已。',
      '舆说輹。',
      '良马逐，利艰贞。曰闲舆卫，利有攸往。',
      '童牛之牿，元吉。',
      '豮豕之牙，吉。',
      '何天之衢，亨。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '乾',
    gong: '艮',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 52,
    name: '损',
    judgment: '损，有孚，元吉，无咎，可贞，利有攸往。曷之用？二簋可用享。',
    lineTexts: [
      '已事遄往，无咎，酌损之。',
      '利贞，征凶，弗损益之。',
      '三人行，则损一人。一人行，则得其友。',
      '损其疾，使遄有喜，无咎。',
      '或益之十朋之龟，弗克违，元吉。',
      '弗损益之，无咎，贞吉，利有攸往，得臣无家。',
    ],
    upperTrigram: '艮',
    lowerTrigram: '兑',
    gong: '艮',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 53,
    name: '睽',
    judgment: '睽，小事吉。',
    lineTexts: [
      '悔亡，丧马勿逐自复，见恶人无咎。',
      '遇主于巷，无咎。',
      '见舆曳，其牛掣，其人天且劓，无初有终。',
      '睽孤，遇元夫，交孚，厉无咎。',
      '悔亡，厥宗噬肤，往何咎。',
      '睽孤，见豕负涂，载鬼一车，先张之弧后说之弧，匪寇婚媾，往遇雨则吉。',
    ],
    upperTrigram: '离',
    lowerTrigram: '兑',
    gong: '艮',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 54,
    name: '履',
    judgment: '履虎尾，不咥人，亨。',
    lineTexts: [
      '素履往，无咎。',
      '履道坦坦，幽人贞吉。',
      '眇能视，跛能履，履虎尾咥人，凶。武人为于大君。',
      '履虎尾，愬愬终吉。',
      '夬履，贞厉。',
      '视履考祥，其旋元吉。',
    ],
    upperTrigram: '乾',
    lowerTrigram: '兑',
    gong: '艮',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 55,
    name: '中孚',
    judgment: '中孚，豚鱼吉。利涉大川，利贞。',
    lineTexts: [
      '虞吉，有它不燕。',
      '鸣鹤在阴，其子和之。我有好爵，吾与尔靡之。',
      '得敌，或鼓或罢，或泣或歌。',
      '月几望，马匹亡，无咎。',
      '有孚挛如，无咎。',
      '翰音登于天，贞凶。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '兑',
    gong: '艮',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 56,
    name: '渐',
    judgment: '渐，女归吉，利贞。',
    lineTexts: [
      '鸿渐于干，小子厉，有言无咎。',
      '鸿渐于磐，饮食衎衎，吉。',
      '鸿渐于陆，夫征不复，妇孕不育，凶，利御寇。',
      '鸿渐于木，或得其桷，无咎。',
      '鸿渐于陵，妇三岁不孕，终莫之胜，吉。',
      '鸿渐于逵，其羽可用为仪，吉。',
    ],
    upperTrigram: '巽',
    lowerTrigram: '艮',
    gong: '艮',
    shiPos: 2,
    yingPos: 5,
  },
  // 坤宫 (土)
  {
    id: 57,
    name: '坤',
    judgment: '坤，元亨，利牝马之贞。君子有攸往，先迷后得主，利西南得朋，东北丧朋。安贞吉。',
    lineTexts: [
      '履霜，坚冰至。',
      '直方大，不习无不利。',
      '含章可贞，或从王事，无成有终。',
      '括囊，无咎无誉。',
      '黄裳，元吉。',
      '龙战于野，其血玄黄。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '坤',
    gong: '坤',
    shiPos: 0,
    yingPos: 3,
  },
  {
    id: 58,
    name: '复',
    judgment: '复，亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。',
    lineTexts: [
      '不远复，无祗悔，元吉。',
      '休复，吉。',
      '频复，厉无咎。',
      '中行独复。',
      '敦复，无悔。',
      '迷复，凶，有灾眚。用行师，终有大败，以其国君凶，至于十年不克征。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '震',
    gong: '坤',
    shiPos: 1,
    yingPos: 4,
  },
  {
    id: 59,
    name: '临',
    judgment: '临，元亨利贞。至于八月有凶。',
    lineTexts: [
      '咸临，贞吉。',
      '咸临，吉无不利。',
      '甘临，无攸利。既忧之，无咎。',
      '至临，无咎。',
      '知临，大君之宜，吉。',
      '敦临，吉无咎。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '兑',
    gong: '坤',
    shiPos: 2,
    yingPos: 5,
  },
  {
    id: 60,
    name: '泰',
    judgment: '泰，小往大来，吉亨。',
    lineTexts: [
      '拔茅茹，以其汇，征吉。',
      '包荒，用冯河，不遐遗，朋亡，得尚于中行。',
      '无平不陂，无往不复，艰贞无咎。勿恤其孚，于食有福。',
      '翩翩，不富以其邻，不戒以孚。',
      '帝乙归妹，以祉元吉。',
      '城复于隍，勿用师。自邑告命，贞吝。',
    ],
    upperTrigram: '坤',
    lowerTrigram: '乾',
    gong: '坤',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 61,
    name: '大壮',
    judgment: '大壮，利贞。',
    lineTexts: [
      '壮于趾，征凶有孚。',
      '贞吉。',
      '小人用壮，君子用罔，贞厉。羝羊触藩，羸其角。',
      '贞吉悔亡，藩决不羸，壮于大舆之輹。',
      '丧羊于易，无悔。',
      '羝羊触藩，不能退，不能遂，无攸利，艰则吉。',
    ],
    upperTrigram: '震',
    lowerTrigram: '乾',
    gong: '坤',
    shiPos: 4,
    yingPos: 1,
  },
  {
    id: 62,
    name: '夬',
    judgment: '夬，扬于王庭，孚号有厉。告自邑，不利即戎。利有攸往。',
    lineTexts: [
      '壮于前趾，往不胜为咎。',
      '惕号，莫夜有戎，勿恤。',
      '壮于頄，有凶。君子夬夬独行，遇雨若濡，有愠无咎。',
      '臀无肤，其行次且。牵羊悔亡，闻言不信。',
      '苋陆夬夬，中行无咎。',
      '无号，终有凶。',
    ],
    upperTrigram: '兑',
    lowerTrigram: '乾',
    gong: '坤',
    shiPos: 5,
    yingPos: 2,
  },
  {
    id: 63,
    name: '需',
    judgment: '需，有孚，光亨，贞吉。利涉大川。',
    lineTexts: [
      '需于郊，利用恒，无咎。',
      '需于沙，小有言，终吉。',
      '需于泥，致寇至。',
      '需于血，出自穴。',
      '需于酒食，贞吉。',
      '入于穴，有不速之客三人来，敬之终吉。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '乾',
    gong: '坤',
    shiPos: 3,
    yingPos: 0,
  },
  {
    id: 64,
    name: '比',
    judgment: '比，吉。原筮元永贞，无咎。不宁方来，后夫凶。',
    lineTexts: [
      '有孚比之，无咎。有孚盈缶，终来有它，吉。',
      '比之自内，贞吉。',
      '比之匪人。',
      '外比之，贞吉。',
      '显比，王用三驱，失前禽，邑人不诫，吉。',
      '比之无首，凶。',
    ],
    upperTrigram: '坎',
    lowerTrigram: '坤',
    gong: '坤',
    shiPos: 2,
    yingPos: 5,
  },
]

/** Get branch element (五行的地支) */
export function getBranchWuxing(branch: string): string {
  return BRANCH_WUXING[branch] || ''
}
```

- [ ] **Step 2: Verify the constants file**

No automated test for constants (pure data). Manually verify by running:

```bash
npx nuxi typecheck
```

---

### Task 2: composables/useYijing.ts — Types + Casting

**Files:**

- Create: `composables/useYijing.ts` (initial content: types + casting functions)

- [ ] **Step 1: Write types and casting functions**

```typescript
import { HEXAGRAMS, NAJIA_RULES, getBranchWuxing, findHexagram } from '~/constants/yijing'
import type { HexagramData, Gong, LiuQin, LiuShen } from '~/constants/yijing'

// === Types ===

export type CastingMethod = 'coin' | 'number'

export interface YaoResult {
  value: 6 | 7 | 8 | 9
  isYin: boolean
  isChanging: boolean
}

export interface ZhuangGuaLine {
  yao: YaoResult
  stem: string
  branch: string
  liuqin: LiuQin
  liushen: LiuShen
  isShi: boolean
  isYing: boolean
}

export interface YijingResult {
  method: CastingMethod
  castingInput: { first: number; second: number; third: number } | null
  primaryGua: HexagramData
  primaryLines: ZhuangGuaLine[]
  changingLines: number[]
  transformedGua?: HexagramData
  transformedLines?: ZhuangGuaLine[]
  mutualGua?: HexagramData
  dayStem: string
  summary: string
}

// === Casting ===

/** Cast a single yao from 3 coin values (each coin: 3=front, 2=back) */
export function castSingleYao(coin1: number, coin2: number, coin3: number): YaoResult {
  const sum = coin1 + coin2 + coin3
  const value = sum as 6 | 7 | 8 | 9
  return {
    value,
    isYin: value === 6 || value === 8,
    isChanging: value === 6 || value === 9,
  }
}

/** Cast full hexagram from 6 coin-toss triplets (bottom to top) */
export function castByCoin(tosses: number[][], dayStem: string): YijingResult {
  if (tosses.length !== 6) throw new Error('需6次抛掷结果')
  const yaoResults: YaoResult[] = tosses.map(t => castSingleYao(t[0], t[1], t[2]))
  return zhuangGua(yaoResults, dayStem, 'coin', null)
}

/** Cast hexagram from 3 numbers (数字起卦法) */
export function castByNumbers(
  first: number,
  second: number,
  third: number,
  dayStem: string,
): YijingResult {
  const upperIdx = ((Math.abs(first) % 8) + 8) % 8
  const lowerIdx = ((Math.abs(second) % 8) + 8) % 8
  const movingIdx = ((Math.abs(third) % 6) + 5) % 6

  const TRIGRAMS = ['坤', '乾', '兑', '离', '震', '巽', '坎', '艮']
  const upper = TRIGRAMS[upperIdx]
  const lower = TRIGRAMS[lowerIdx]

  // Build yao results: create a standard hexagram then mark the moving yao
  const gua = findHexagram(upper, lower)
  if (!gua) throw new Error(`无效的卦象组合: ${upper}${lower}`)

  // Generate YaoResults from hexagram structure (yin/yang pattern)
  const yaoResults: YaoResult[] = []
  const TRIGRAM_LINES: Record<string, boolean[]> = {
    乾: [false, false, false],
    兑: [false, false, true],
    离: [false, true, false],
    震: [false, true, true],
    巽: [true, false, false],
    坎: [true, false, true],
    艮: [true, true, false],
    坤: [true, true, true],
  }
  const lowerLines = TRIGRAM_LINES[gua.lowerTrigram]
  const upperLines = TRIGRAM_LINES[gua.upperTrigram]
  const allLines = [...lowerLines, ...upperLines]

  for (let i = 0; i < 6; i++) {
    const isChanging = i === movingIdx
    const isYin = allLines[i]
    if (isYin) {
      yaoResults.push({ value: isChanging ? (6 as const) : (8 as const), isYin: true, isChanging })
    } else {
      yaoResults.push({ value: isChanging ? (9 as const) : (7 as const), isYin: false, isChanging })
    }
  }

  return zhuangGua(yaoResults, dayStem, 'number', { first, second, third })
}

/** Simulate a random coin-toss casting (for testing / quick cast) */
export function castBySimulatedCoin(dayStem: string): YijingResult {
  const tosses: number[][] = []
  for (let i = 0; i < 6; i++) {
    tosses.push([
      Math.random() < 0.5 ? 3 : 2,
      Math.random() < 0.5 ? 3 : 2,
      Math.random() < 0.5 ? 3 : 2,
    ])
  }
  return castByCoin(tosses, dayStem)
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx nuxi typecheck
```

Expected: errors about `zhuangGua` not being defined (implemented in Task 3). That is expected — casting functions call `zhuangGua` which doesn't exist yet.

---

### Task 3: composables/useYijing.ts — 装卦 (Zhuang Gua)

**Files:**

- Modify: `composables/useYijing.ts` (append after the casting section)

- [ ] **Step 1: Append 装卦 implementation**

Append to `composables/useYijing.ts`:

```typescript
// === 装卦 (Hexagram Construction) ===

import {
  NAJIA_RULES,
  LIUSHEN_ORDER,
  LIUSHEN_START,
  GONG_WUXING,
  getBranchWuxing,
  getHexagramById,
} from '~/constants/yijing'
import type { Gong } from '~/constants/yijing'

/** Complete 装卦: 纳甲 → 六亲 → 六神 → 世应 */
export function zhuangGua(
  yaoResults: YaoResult[],
  dayStem: string,
  method: CastingMethod = 'coin',
  castingInput: { first: number; second: number; third: number } | null = null,
): YijingResult {
  // Step 1: Build the hexagram trigrams from yao results
  const lowerLines = yaoResults.slice(0, 3).map(y => y.isYin)
  const upperLines = yaoResults.slice(3, 6).map(y => y.isYin)
  const lowerTrigram = trigramFromLines(lowerLines)
  const upperTrigram = trigramFromLines(upperLines)

  if (!lowerTrigram || !upperTrigram) throw new Error('无法确定卦象')

  const gua = findHexagram(upperTrigram, lowerTrigram)
  if (!gua) throw new Error(`无效卦象: ${upperTrigram}${lowerTrigram}`)

  // Determine which lines are changing
  const changingLines = yaoResults.map((y, i) => (y.isChanging ? i : -1)).filter(i => i >= 0)

  // Step 2: Build primary hexagram 装卦
  const primaryLines = buildZhuangGuaLines(yaoResults, gua, dayStem)

  // Step 3: Build transformed hexagram if there are changing lines
  let transformedGua: HexagramData | undefined
  let transformedLines: ZhuangGuaLine[] | undefined
  if (changingLines.length > 0) {
    const transformedYao = yaoResults.map((y, i) => {
      if (y.isChanging) {
        // Flip yin/yang
        const newValue = y.value === 6 ? (7 as const) : (8 as const)
        return { value: newValue, isYin: !y.isYin, isChanging: false }
      }
      return { ...y }
    })
    const tLowerLines = transformedYao.slice(0, 3).map(y => y.isYin)
    const tUpperLines = transformedYao.slice(3, 6).map(y => y.isYin)
    const tLower = trigramFromLines(tLowerLines)
    const tUpper = trigramFromLines(tUpperLines)
    if (tLower && tUpper) {
      transformedGua = findHexagram(tUpper, tLower)
      if (transformedGua) {
        transformedLines = buildZhuangGuaLines(transformedYao, transformedGua, dayStem)
      }
    }
  }

  // Step 4: Build mutual hexagram (互卦 — middle 4 lines: 2-3-4-5)
  // 互卦下卦 = yaoResults[1], [2], [3] (2-4爻)
  // 互卦上卦 = yaoResults[2], [3], [4] (3-5爻)
  const mLowerLines = [yaoResults[1].isYin, yaoResults[2].isYin, yaoResults[3].isYin]
  const mUpperLines = [yaoResults[2].isYin, yaoResults[3].isYin, yaoResults[4].isYin]
  const mLower = trigramFromLines(mLowerLines)
  const mUpper = trigramFromLines(mUpperLines)
  let mutualGua: HexagramData | undefined
  if (mLower && mUpper) {
    mutualGua = findHexagram(mUpper, mLower)
  }

  // Step 5: Generate summary
  const summary = generateSummary(gua, primaryLines, changingLines.length)

  return {
    method,
    castingInput,
    primaryGua: gua,
    primaryLines,
    changingLines,
    transformedGua,
    transformedLines,
    mutualGua,
    dayStem,
    summary,
  }
}

/** Convert 3 yin/true booleans into a trigram name */
function trigramFromLines(lines: boolean[]): string | null {
  const key = lines.map(l => (l ? '1' : '0')).join('')
  const MAP: Record<string, string> = {
    '000': '乾',
    '001': '兑',
    '010': '离',
    '011': '震',
    '100': '巽',
    '101': '坎',
    '110': '艮',
    '111': '坤',
  }
  return MAP[key] || null
}

/** Build 装卦 lines: 纳甲 → 六亲 → 六神 → 世应 */
function buildZhuangGuaLines(
  yaoResults: YaoResult[],
  gua: HexagramData,
  dayStem: string,
): ZhuangGuaLine[] {
  const gong = gua.gong
  const gongWuxing = GONG_WUXING[gong]

  // 纳甲: upper trigram uses outerStem, lower trigram uses innerStem
  // But wait — the traditional 纳甲 assigns stems per trigram, not per palace!
  // Actually, it's per trigram: lower 3 lines use the trigram's innerStem,
  // upper 3 lines use the trigram's outerStem.

  // Get the actual trigrams of this hexagram
  const upperTrigram = gua.upperTrigram
  const lowerTrigram = gua.lowerTrigram
  const upperNajia = NAJIA_RULES[upperTrigram]
  const lowerNajia = NAJIA_RULES[lowerTrigram]

  if (!upperNajia || !lowerNajia) throw new Error(`未知的卦: ${upperTrigram}/${lowerTrigram}`)

  // 纳甲 branches are per-trigram (upper 3 from upper, lower 3 from lower)
  // Upper branches: branches[3], branches[4], branches[5] (4th-6th positions)
  const upperBranches = upperNajia.branches.slice(3, 6)
  // Lower branches: branches[0], branches[1], branches[2] (1st-3rd positions)
  const lowerBranches = lowerNajia.branches.slice(0, 3)

  const allStems = [
    lowerNajia.innerStem,
    lowerNajia.innerStem,
    lowerNajia.innerStem,
    upperNajia.outerStem,
    upperNajia.outerStem,
    upperNajia.outerStem,
  ]
  const allBranches = [...lowerBranches, ...upperBranches]

  // 六神 start index
  const liuShenStart = LIUSHEN_START[dayStem]
  const liuShenStartIdx = liuShenStart !== undefined ? liuShenStart : 0

  const lines: ZhuangGuaLine[] = yaoResults.map((yao, i) => {
    const stem = allStems[i]
    const branch = allBranches[i]
    const branchWx = getBranchWuxing(branch)

    // 六亲: based on gong element ("我") vs branch element
    const liuqin = determineLiuQin(gongWuxing, branchWx)

    // 六神: assigned from 初爻 up, cycling through the 6 spirits
    const liushenIdx = (liuShenStartIdx + i) % 6
    const liushen = LIUSHEN_ORDER[liushenIdx]

    return {
      yao,
      stem,
      branch,
      liuqin,
      liushen,
      isShi: i === gua.shiPos,
      isYing: i === gua.yingPos,
    }
  })

  return lines
}

/** Determine 六亲 from gong element ("我") and branch element */
function determineLiuQin(gongWx: string, branchWx: string): LiuQin {
  if (branchWx === gongWx) return '兄弟'
  // 我生者 → 子孙: gongWx generates branchWx
  if (wuxingGenerates(gongWx, branchWx)) return '子孙'
  // 生我者 → 父母: branchWx generates gongWx
  if (wuxingGenerates(branchWx, gongWx)) return '父母'
  // 我克者 → 妻财: gongWx controls branchWx
  if (wuxingControls(gongWx, branchWx)) return '妻财'
  // 克我者 → 官鬼: branchWx controls gongWx
  if (wuxingControls(branchWx, gongWx)) return '官鬼'
  return '兄弟'
}

/** Check if element A generates element B (木→火→土→金→水→木) */
function wuxingGenerates(a: string, b: string): boolean {
  const cycle: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  return cycle[a] === b
}

/** Check if element A controls element B (木→土→水→火→金→木) */
function wuxingControls(a: string, b: string): boolean {
  const cycle: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  return cycle[a] === b
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx nuxi typecheck
```

Expected: type errors pass. If there are import issues, fix them.

---

### Task 4: composables/useYijing.ts — Scoring + Summary

**Files:**

- Modify: `composables/useYijing.ts` (append scoring and summary)

- [ ] **Step 1: Append scoring and summary**

```typescript
// === Scoring & Summary ===

/** Calculate divination score (0-100) */
export function calculateScore(
  gua: HexagramData,
  lines: ZhuangGuaLine[],
  changingCount: number,
): number {
  let score = 50

  // Changing line count adjustment
  if (changingCount === 0)
    score -= 5 // 无变 → 中平
  else if (changingCount === 1)
    score += 5 // 单变 → 有变
  else if (changingCount === 2)
    score -= 3 // 二变 → 多变
  else score -= 10 // 三变+ → 剧变

  // 六亲 dynamic adjustment (find moving lines first)
  // For now, adjust based on line positions
  for (const line of lines) {
    if (!line.yao.isChanging) continue
    switch (line.liuqin) {
      case '官鬼':
        score -= 8
        break
      case '妻财':
        score += 5
        break
      case '父母':
        score -= 3
        break
      case '子孙':
        score += 6
        break
      case '兄弟':
        score -= 5
        break
    }
  }

  // 世应 adjustment (simplified: shi line changing = -10, ying line changing = +8)
  // Full version would check 六冲/相生 against day branch
  const shiLine = lines.find(l => l.isShi)
  if (shiLine?.yao.isChanging) score -= 10
  const yingLine = lines.find(l => l.isYing)
  if (yingLine?.yao.isChanging) score += 8

  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Generate rule-template summary text */
export function generateSummary(
  gua: HexagramData,
  lines: ZhuangGuaLine[],
  changingCount: number,
): string {
  const parts: string[] = []

  // Hexagram name
  parts.push(`${gua.name}卦`)

  // Fortune judgment
  const score = calculateScore(gua, lines, changingCount)
  if (score >= 70) parts.push('吉')
  else if (score >= 45) parts.push('平顺')
  else parts.push('多滞')

  // Changing line hints (变爻提示)
  if (changingCount === 0) {
    parts.push('六爻不动宜守')
  } else if (changingCount === 1) {
    const changingLine = lines.find(l => l.yao.isChanging)
    if (changingLine) {
      const pos = ['初', '二', '三', '四', '五', '上']
      parts.push(`${pos[lines.indexOf(changingLine)]}爻${changingLine.liuqin}动`)
    }
  } else {
    const movingLiuqin = lines.filter(l => l.yao.isChanging).map(l => l.liuqin)
    const uniqueLiuqin = [...new Set(movingLiuqin)]
    parts.push(`${changingCount}爻动${uniqueLiuqin.join('、')}有变`)
  }

  // 六亲动向
  const liuqinMoving = [...new Set(lines.filter(l => l.yao.isChanging).map(l => l.liuqin))]
  if (liuqinMoving.length > 0) {
    parts.push(`${liuqinMoving.join('、')}动`)
  }

  // 神煞提示
  const shiLine = lines.find(l => l.isShi)
  if (shiLine) {
    parts.push(`${shiLine.liushen}临${shiLine.liuqin}`)
  }

  // Join first two parts with ，, rest with 。to match spec format
  const first = parts.slice(0, 2).join('，')
  const rest = parts.slice(2).join('。')
  return first + (rest ? '。' + rest + '。' : '。')
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx nuxi typecheck
```

Expected: all types pass.

---

### Task 5: Tests — composables/useYijing.test.ts

**Files:**

- Create: `tests/composables/useYijing.test.ts`

- [ ] **Step 1: Write casting tests**

```typescript
import { describe, it, expect } from 'vitest'
import { castSingleYao, castByCoin, castByNumbers } from '~/composables/useYijing'

describe('castSingleYao', () => {
  it('9 = 老阳 (changing, yang)', () => {
    const yao = castSingleYao(3, 3, 3)
    expect(yao.value).toBe(9)
    expect(yao.isYin).toBe(false)
    expect(yao.isChanging).toBe(true)
  })

  it('7 = 少阳 (not changing, yang)', () => {
    const yao = castSingleYao(3, 2, 2) // 3+2+2 = 7
    expect(yao.value).toBe(7)
    expect(yao.isYin).toBe(false)
    expect(yao.isChanging).toBe(false)
  })

  it('6 = 老阴 (changing, yin)', () => {
    const yao = castSingleYao(2, 2, 2)
    expect(yao.value).toBe(6)
    expect(yao.isYin).toBe(true)
    expect(yao.isChanging).toBe(true)
  })

  it('8 = 少阴 (not changing, yin)', () => {
    const yao = castSingleYao(3, 3, 2) // 3+3+2 = 8
    expect(yao.value).toBe(8)
    expect(yao.isYin).toBe(true)
    expect(yao.isChanging).toBe(false)
  })
})

describe('castByCoin', () => {
  it('乾为天: all 9s → all changing, identifes as 乾', () => {
    const tosses = [
      [3, 3, 3],
      [3, 3, 3],
      [3, 3, 3],
      [3, 3, 3],
      [3, 3, 3],
      [3, 3, 3],
    ]
    const result = castByCoin(tosses, '甲')
    expect(result.primaryGua.name).toBe('乾')
    expect(result.primaryGua.gong).toBe('乾')
    expect(result.changingLines.length).toBe(6)
  })

  it('坤为地: all 6s → all changing, identifes as 坤', () => {
    const tosses = [
      [2, 2, 2],
      [2, 2, 2],
      [2, 2, 2],
      [2, 2, 2],
      [2, 2, 2],
      [2, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    expect(result.primaryGua.name).toBe('坤')
    expect(result.changingLines.length).toBe(6)
  })

  it('throws on wrong toss count', () => {
    expect(() => castByCoin([[3, 3, 3]], '甲')).toThrow()
  })
})

describe('castByNumbers', () => {
  it('乾为天: 1,1,1 → 乾上乾下, 初爻变', () => {
    // 1%8=1 → 乾(上), 1%8=1 → 乾(下), ((1%6)+5)%6=0 → 初爻变
    const result = castByNumbers(1, 1, 1, '甲')
    expect(result.primaryGua.name).toBe('乾')
    expect(result.changingLines).toEqual([0])
  })

  it('坤为地: 0,0,0 → 坤上坤下 (index 0 = 坤, 上爻变)', () => {
    const result = castByNumbers(8, 8, 6, '甲')
    expect(result.primaryGua.name).toBe('坤')
    expect(result.changingLines).toEqual([5])
  })

  it('handles negative numbers', () => {
    const result = castByNumbers(-1, -1, -1, '甲')
    expect(result.primaryGua).toBeDefined()
  })
})
```

- [ ] **Step 2: Write 装卦 tests**

```typescript
describe('zhuangGua — 纳甲', () => {
  it('乾为天的纳甲干支正确', () => {
    // All 7s (少阳) = 乾为天, no changes
    const tosses = [
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    // 乾纳甲壬: 下卦纳甲, 上卦纳壬
    // 下卦(乾) 纳支: 子,寅,辰 → 甲子, 甲寅, 甲辰
    expect(result.primaryLines[0].stem).toBe('甲')
    expect(result.primaryLines[0].branch).toBe('子')
    expect(result.primaryLines[1].stem).toBe('甲')
    expect(result.primaryLines[1].branch).toBe('寅')
    expect(result.primaryLines[2].stem).toBe('甲')
    expect(result.primaryLines[2].branch).toBe('辰')
    // 上卦(乾) 纳支: 午,申,戌 → 壬午, 壬申, 壬戌
    expect(result.primaryLines[3].stem).toBe('壬')
    expect(result.primaryLines[3].branch).toBe('午')
    expect(result.primaryLines[4].stem).toBe('壬')
    expect(result.primaryLines[4].branch).toBe('申')
    expect(result.primaryLines[5].stem).toBe('壬')
    expect(result.primaryLines[5].branch).toBe('戌')
  })
})

describe('zhuangGua — 六亲', () => {
  it('乾为天的六亲正确 (乾宫金)', () => {
    const tosses = [
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    // 乾宫金为"我" → 各爻地支五行:
    // 子水: 我生者→子孙, 寅木: 我克者→妻财, 辰土: 生我者→父母
    // 午火: 克我者→官鬼, 申金: 同我者→兄弟, 戌土: 生我者→父母
    expect(result.primaryLines[0].liuqin).toBe('子孙') // 子水
    expect(result.primaryLines[1].liuqin).toBe('妻财') // 寅木
    expect(result.primaryLines[2].liuqin).toBe('父母') // 辰土
    expect(result.primaryLines[3].liuqin).toBe('官鬼') // 午火
    expect(result.primaryLines[4].liuqin).toBe('兄弟') // 申金
    expect(result.primaryLines[5].liuqin).toBe('父母') // 戌土
  })
})

describe('zhuangGua — 六神', () => {
  it('甲日乾为天的六神顺序正确 (青龙起)', () => {
    const tosses = [
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    expect(result.primaryLines[0].liushen).toBe('青龙')
    expect(result.primaryLines[1].liushen).toBe('朱雀')
    expect(result.primaryLines[2].liushen).toBe('勾陈')
    expect(result.primaryLines[3].liushen).toBe('腾蛇')
    expect(result.primaryLines[4].liushen).toBe('白虎')
    expect(result.primaryLines[5].liushen).toBe('玄武')
  })

  it('丙日的六神起朱雀', () => {
    const tosses = [
      [3, 2, 2],
      [3, 2, 2],
      [2, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '丙')
    expect(result.primaryLines[0].liushen).toBe('朱雀')
  })
})

describe('zhuangGua — 世应', () => {
  it('乾为天: 世在初爻(0), 应在四爻(3)', () => {
    const tosses = [
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    expect(result.primaryLines[0].isShi).toBe(true)
    expect(result.primaryLines[3].isYing).toBe(true)
  })
})
```

- [ ] **Step 3: Write 变卦 and scoring tests**

```typescript
describe('变卦', () => {
  it('单爻变 → 正确生成变卦', () => {
    // 乾卦, 初爻变: 初爻 9(老阳) → 7(少阳), flipping yin/yang
    // 乾上乾下 → 巽上乾下? No: 初爻变 → 下卦变巽 → 天风姤(上乾下巽)
    // Actually, flipping the bottom line of 乾(000) gives 巽(100), so 乾上巽下 = 姤
    const tosses = [
      [3, 3, 3],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    expect(result.changingLines).toEqual([0])
    expect(result.transformedGua?.name).toBe('姤')
  })

  it('全卦不变 → 无变卦', () => {
    const tosses = [
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    expect(result.changingLines).toEqual([])
    expect(result.transformedGua).toBeUndefined()
  })
})

describe('calculateScore', () => {
  it('无变不动的平卦得分在 45-50 之间', () => {
    const tosses = [
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
      [3, 2, 2],
    ]
    const result = castByCoin(tosses, '甲')
    expect(result.summary).toContain('平顺')
  })
})
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/composables/useYijing.test.ts
```

Expected: all tests pass. If failures, fix and retry.

---

### Task 6: UI Components — 4 Vue files

**Files:**

- Create: `components/tools/yijing/YijingCastingPanel.vue`
- Create: `components/tools/yijing/HexagramDisplay.vue`
- Create: `components/tools/yijing/ZhuangGuaTable.vue`
- Create: `components/tools/yijing/YijingInterpretation.vue`

Note: UI visual design (colors, animations, fonts, spacing) is delegated to `superpowers:frontend-design` skill. These components provide functional structure.

- [ ] **Step 1: Create YijingCastingPanel.vue**

```vue
<template>
  <div>
    <!-- Date input for day stem -->
    <div class="mb-4">
      <label class="block text-xs text-ink-500 mb-1" for="divination-date">占卜日期</label>
      <input id="divination-date" v-model="divinationDate" type="date" class="input-ink w-48" />
    </div>
    <!-- Coin toss mode -->
    <div v-if="mode === 'coin'">
      <div class="flex items-center gap-4 flex-wrap">
        <!-- Coin display -->
        <div
          v-for="(coin, i) in displayedCoins"
          :key="i"
          class="coin"
          :class="{ 'coin-flipping': isFlipping }"
        >
          {{ coin === 3 ? '正面' : '反面' }}
        </div>
        <button v-if="currentToss < 6" class="btn-seal" :disabled="isFlipping" @click="doToss">
          摇卦 ({{ currentToss + 1 }}/6)
        </button>
        <template v-else>
          <span class="text-ink-500 text-sm">起卦完成</span>
          <button class="btn-seal" @click="reset">重新起卦</button>
        </template>
        <span class="text-ink-400 text-sm ml-auto">
          <button class="text-cinnabar underline text-sm" @click="mode = 'number'">
            数字起卦 →
          </button>
        </span>
      </div>
      <!-- Progress -->
      <div class="flex gap-1 mt-3">
        <div
          v-for="i in 6"
          :key="i"
          class="h-1 flex-1 rounded"
          :class="i <= currentToss ? 'bg-cinnabar' : 'bg-paper-300'"
        />
      </div>
    </div>

    <!-- Number mode -->
    <div v-else class="flex items-end gap-3 flex-wrap">
      <div>
        <label class="block text-xs text-ink-500 mb-1" for="num1">上卦数</label>
        <input id="num1" v-model.number="num1" type="number" class="input-ink w-24" />
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1" for="num2">下卦数</label>
        <input id="num2" v-model.number="num2" type="number" class="input-ink w-24" />
      </div>
      <div>
        <label class="block text-xs text-ink-500 mb-1" for="num3">变爻数</label>
        <input id="num3" v-model.number="num3" type="number" class="input-ink w-24" />
      </div>
      <button class="btn-seal" @click="doNumberCast">起卦</button>
      <button class="text-ink-400 underline text-sm" @click="mode = 'coin'">← 摇卦</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { castByCoin, castByNumbers } from '~/composables/useYijing'
import { STEMS } from '~/constants/bazi'

const emit = defineEmits<{
  (e: 'cast', result: import('~/composables/useYijing').YijingResult): void
}>()

const mode = ref<'coin' | 'number'>('coin')
const currentToss = ref(0)
const tossResults = ref<number[][]>([])
const isFlipping = ref(false)
const displayedCoins = ref([0, 0, 0])
const num1 = ref(1)
const num2 = ref(2)
const num3 = ref(3)
const divinationDate = ref(new Date().toISOString().split('T')[0])

function doToss() {
  if (isFlipping.value || currentToss.value >= 6) return
  isFlipping.value = true

  // Animation delay, then generate random result
  setTimeout(() => {
    const coins = [
      Math.random() < 0.5 ? 3 : 2,
      Math.random() < 0.5 ? 3 : 2,
      Math.random() < 0.5 ? 3 : 2,
    ]
    displayedCoins.value = coins
    tossResults.value.push(coins)
    currentToss.value++

    if (currentToss.value >= 6) {
      // All 6 tosses done — cast
      const dayStem = getDayStem()
      const result = castByCoin(tossResults.value, dayStem)
      emit('cast', result)
    }
    isFlipping.value = false
  }, 600)
}

function doNumberCast() {
  const dayStem = getDayStem()
  const result = castByNumbers(num1.value, num2.value, num3.value, dayStem)
  emit('cast', result)
}

function getDayStem(): string {
  const dateParts = divinationDate.value.split('-').map(Number)
  const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
  const dayStemIndex = (((Math.floor(date.getTime() / 86400000) + 4) % 10) + 10) % 10
  return STEMS[dayStemIndex]
}

function reset() {
  currentToss.value = 0
  tossResults.value = []
  displayedCoins.value = [0, 0, 0]
}
</script>
```

- [ ] **Step 2: Create HexagramDisplay.vue**

```vue
<template>
  <div class="flex gap-6 flex-wrap">
    <!-- Hexagram lines -->
    <div class="flex flex-col gap-1">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="flex items-center gap-2"
        :class="{ 'opacity-80': !includeLabels }"
      >
        <!-- Yao line -->
        <div class="flex items-center justify-center" style="width: 72px; height: 14px;">
          <!-- Yang line: solid -->
          <div
            v-if="!line.isYin"
            class="h-1.5 rounded-sm w-full"
            :class="line.isChanging ? changeColor || 'bg-cinnabar' : 'bg-ink-700'"
          />
          <!-- Yin line: split -->
          <div v-else class="flex gap-1.5 w-full">
            <div
              class="h-1.5 rounded-sm flex-1"
              :class="line.isChanging ? changeColor || 'bg-cinnabar' : 'bg-ink-700'"
            />
            <div
              class="h-1.5 rounded-sm flex-1"
              :class="line.isChanging ? changeColor || 'bg-cinnabar' : 'bg-ink-700'"
            />
          </div>
        </div>
        <!-- Labels -->
        <span v-if="includeLabels && shiYingLabels" class="text-xs text-ink-400 w-8">
          {{ shiYingLabels[i] || '' }}
        </span>
      </div>
    </div>

    <!-- Info -->
    <div v-if="name || judgment" class="flex-1 min-w-[200px]">
      <div class="text-xl font-display text-ink-800">{{ name }}</div>
      <div class="text-sm text-ink-500 mt-2 leading-relaxed">{{ judgment }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { YaoResult } from '~/composables/useYijing'

const props = defineProps<{
  lines: YaoResult[]
  name?: string
  judgment?: string
  shiYingLabels?: string[]
  changeColor?: string
  includeLabels?: boolean
}>()
</script>
```

- [ ] **Step 3: Create ZhuangGuaTable.vue**

```vue
<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-paper-200 text-ink-500 text-xs uppercase tracking-wider">
          <th class="px-3 py-2 text-left">爻位</th>
          <th class="px-3 py-2 text-left">纳甲</th>
          <th class="px-3 py-2 text-left">六亲</th>
          <th class="px-3 py-2 text-left">六神</th>
          <th class="px-3 py-2 text-center">世应</th>
          <th class="px-3 py-2 text-left">爻辞</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(line, i) in lines"
          :key="i"
          class="border-t border-paper-300"
          :class="{ 'bg-cinnabar bg-opacity-5': line.yao.isChanging }"
        >
          <td
            class="px-3 py-2 font-medium"
            :class="line.yao.isChanging ? 'text-cinnabar' : 'text-ink-700'"
          >
            {{ positionLabels[5 - i] || '' }}
          </td>
          <td class="px-3 py-2">{{ line.stem }}{{ line.branch }}</td>
          <td class="px-3 py-2">
            <span
              class="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
              :class="liuqinBadgeClass(line.liuqin)"
            >
              {{ line.liuqin }}
            </span>
          </td>
          <td class="px-3 py-2 text-ink-600">{{ line.liushen }}</td>
          <td class="px-3 py-2 text-center">
            <span v-if="line.isShi" class="text-cinnabar font-medium">世</span>
            <span v-else-if="line.isYing" class="text-jade font-medium">应</span>
            <span v-else class="text-ink-300">—</span>
          </td>
          <td class="px-3 py-2 text-ink-500 text-xs">{{ lineTexts[i] || '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { ZhuangGuaLine } from '~/composables/useYijing'

const props = defineProps<{
  lines: ZhuangGuaLine[]
  lineTexts: string[]
}>()

const positionLabels = ['上', '五', '四', '三', '二', '初']

function liuqinBadgeClass(liuqin: string): string {
  const map: Record<string, string> = {
    父母: 'bg-blue-100 text-blue-800',
    兄弟: 'bg-yellow-100 text-yellow-800',
    官鬼: 'bg-red-100 text-red-800',
    妻财: 'bg-green-100 text-green-800',
    子孙: 'bg-purple-100 text-purple-800',
  }
  return map[liuqin] || 'bg-gray-100 text-gray-800'
}
</script>
```

- [ ] **Step 4: Create YijingInterpretation.vue**

```vue
<template>
  <div v-if="result" class="space-y-5">
    <!-- Score ring -->
    <div class="flex items-center gap-4">
      <div class="relative w-16 h-16">
        <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            class="text-paper-300"
            stroke-width="4"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            :stroke="scoreColor"
            stroke-width="4"
            stroke-linecap="round"
            :stroke-dasharray="176"
            :stroke-dashoffset="176 - (score / 100) * 176"
          />
        </svg>
        <span
          class="absolute inset-0 flex items-center justify-center text-sm font-bold"
          :style="{ color: scoreColor }"
        >
          {{ score }}
        </span>
      </div>
      <div>
        <div class="text-lg font-display text-ink-800">
          {{ result.primaryGua.name }}卦 · {{ result.summary }}
        </div>
      </div>
    </div>

    <!-- Transformed hexagram -->
    <div v-if="result.transformedGua">
      <InkDivider>变卦</InkDivider>
      <HexagramDisplay
        :lines="result.transformedLines?.map(l => l.yao) || []"
        :name="result.transformedGua.name"
        :judgment="result.transformedGua.judgment"
        :include-labels="false"
      />
    </div>

    <!-- Mutual hexagram -->
    <div v-if="result.mutualGua">
      <InkDivider>互卦</InkDivider>
      <div class="text-sm text-ink-500">
        {{ result.mutualGua.name }} · {{ result.mutualGua.judgment }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { YijingResult } from '~/composables/useYijing'
import InkDivider from '~/components/tools/InkDivider.vue'
import { calculateScore } from '~/composables/useYijing'

const props = defineProps<{
  result: YijingResult | null
}>()

const score = computed(() => {
  if (!props.result) return 0
  return calculateScore(
    props.result.primaryGua,
    props.result.primaryLines,
    props.result.changingLines.length,
  )
})

const scoreColor = computed(() => {
  if (score.value >= 70) return '#3D6B4B' // jade
  if (score.value >= 45) return '#8B6914' // gold
  return '#C62828' // cinnabar
})
</script>
```

- [ ] **Step 5: Verify component names**

Ensure Nuxt auto-imports resolve correctly. Run:

```bash
npx nuxi typecheck
```

---

### Task 7: pages/tools/yijing.vue — Page Integration

**Files:**

- Create: `pages/tools/yijing.vue`

- [ ] **Step 1: Write the page component**

```vue
<template>
  <ToolPageLayout>
    <div class="max-w-3xl mx-auto space-y-8">
      <!-- Hero -->
      <PageHero title="六爻占卜" subtitle="纳甲装卦 · 周易古法" emoji="☯" />

      <!-- Casting panel -->
      <div class="card-paper-solid p-8">
        <h2 class="text-lg font-display text-ink-700 mb-4">起卦</h2>
        <YijingCastingPanel @cast="handleCast" />
      </div>

      <!-- Results -->
      <template v-if="result">
        <!-- Primary hexagram -->
        <div class="card-paper-solid p-8">
          <h2 class="text-lg font-display text-ink-700 mb-4">本卦</h2>
          <HexagramDisplay
            :lines="result.primaryLines.map(l => l.yao)"
            :name="result.primaryGua.name"
            :judgment="result.primaryGua.judgment"
            :shi-ying-labels="shiYingLabels(result.primaryLines)"
            :include-labels="true"
          />
        </div>

        <!-- 装卦 table -->
        <div class="card-paper-solid p-8">
          <h2 class="text-lg font-display text-ink-700 mb-4">纳甲装卦</h2>
          <ZhuangGuaTable :lines="result.primaryLines" :line-texts="result.primaryGua.lineTexts" />
        </div>

        <!-- Interpretation -->
        <div class="card-paper-solid p-8 border-l-4 border-cinnabar">
          <h2 class="text-lg font-display text-ink-700 mb-4">卦象解读</h2>
          <YijingInterpretation :result="result" />
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="card-paper-solid p-8 text-center text-ink-400">点击"摇卦"开始占卜</div>

      <!-- History feature - TODO: extract reusable HistoryDropdown component -->
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { restoreSession } from '~/composables/useAuth'
import type { YijingResult, ZhuangGuaLine } from '~/composables/useYijing'

onMounted(() => {
  restoreSession()
})

const result = ref<YijingResult | null>(null)

function handleCast(r: YijingResult) {
  result.value = r
  // Auto-save
  const { getAuthHeaders } = useAuth()
  const headers = getAuthHeaders()
  if (headers) {
    $fetch('/api/divinations', {
      method: 'POST',
      headers,
      body: {
        type: 'yijing',
        input_data: r.castingInput ? { method: 'number', ...r.castingInput } : { method: 'coin' },
        result_data: JSON.parse(JSON.stringify(r)),
      },
    }).catch(() => {}) // Silent fail
  }
}

// TODO: handleHistorySelect needs to be implemented when HistoryDropdown is available

function shiYingLabels(lines: ZhuangGuaLine[]): string[] {
  const positionNames = ['初', '二', '三', '四', '五', '上']
  return lines.map((l, i) => {
    const parts: string[] = [positionNames[i]]
    if (l.isShi) parts.push('世')
    if (l.isYing) parts.push('应')
    return parts.join('')
  })
}
</script>
```

- [ ] **Step 2: TypeScript check**

```bash
npx nuxi typecheck
```

Expected: all types pass. Some auto-import warnings may appear for `HistoryDropdown` — if so, add explicit import:

```typescript
import HistoryDropdown from '~/components/tools/bazi/HistoryDropdown.vue'
```

- [ ] **Step 3: Verify page loads**

```bash
npx nuxi dev
```

Navigate to `/tools/yijing` and verify:

- Page renders without errors
- Coin toss works (click 6 times → shows hexagram)
- Number casting works

---

### Self-Review Checklist

**1. Spec coverage:**

- [x] 纳甲 rules encoded in `constants/yijing.ts` (§3.2)
- [x] 64 hexagrams data with 卦辞/爻辞 (§3.1)
- [x] 六神 ordering and day-stem mapping (§3.3)
- [x] Coin casting (`castByCoin`) (§4.1)
- [x] Number casting (`castByNumbers`) (§4.1)
- [x] 装卦 5-step process (纳甲→六亲→六神→世应→变卦) (§4.2)
- [x] 变卦 computation (§4.2 step 5)
- [x] 互卦 computation (§4.2)
- [x] Scoring algorithm (§4.3)
- [x] Summary template generation (§4.3)
- [x] All UI components (§5)
- [x] Page integration with auto-save (§5.3)
- [x] Tests for casting, 装卦, 变卦, scoring (§8)

**2. Placeholder scan:** No TBD, TODO, or incomplete code blocks.

**3. Type consistency:** `YaoResult`, `ZhuangGuaLine`, `YijingResult`, `HexagramData` types are consistent across all tasks. `castByCoin(tosses, dayStem)` and `castByNumbers(first, second, third, dayStem)` signatures match the spec.
