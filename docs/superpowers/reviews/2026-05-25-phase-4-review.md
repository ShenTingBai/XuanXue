# Phase 4 Review — Spec vs Plan vs UI Design Consistency

**Reviewed by:** Code Reviewer Agent
**Date:** 2026-05-25
**Documents reviewed:**

- `docs/superpowers/specs/2026-05-25-phase-4-bazi-enhancement-design.md` (Design Spec)
- `docs/superpowers/plans/2026-05-25-phase-4-bazi-enhancement.md` (Implementation Plan)
- `docs/superpowers/specs/2026-05-25-phase-4-bazi-ui-design.md` (UI Design Spec)

**Cross-reference files:**

- `composables/useBaZi.ts`, `composables/useSolarTerms.ts`, `constants/bazi.ts`, `pages/tools/bazi.vue`, `tailwind.config.ts`

---

## Critical Issues (Would Break Implementation)

### 1. Component Insertion Order: UI Design vs Plan Conflict

- **UI Design (Section 1):** Specifies this order:
  - BaziGrid (0.05s) -> **ShenShaPanel (0.15s)** -> ElementAnalysis (0.20s) -> DayMasterCard (0.30s) -> DaYunTimeline (0.40s) -> **LiuNianTimeline (0.50s)** -> Reading Guide

- **Plan (Task 6d):** Places both ShenShaPanel AND LiuNianTimeline AFTER DaYunTimeline:

  ```
  After the DaYunTimeline section, add ShenShaPanel and LiuNianTimeline
  ```

- **Impact:** ShenShaPanel ends up in the wrong position if the plan is followed. The UI design's rationale is explicit — shensha should appear right after the pillar grid so users see "static structure -> derived markers -> elemental balance -> temporal cycles." Placing shensha after DaYunTimeline breaks this information cascade.

- **Fix:** The plan's Task 6d must split the insertion: ShenShaPanel goes between BaziGrid and ElementAnalysis; only LiuNianTimeline goes after DaYunTimeline. The delay values in the template must match the UI design (0.15s for ShenShaPanel, 0.50s for LiuNianTimeline).

### 2. LiuNianInput Missing `shenSha` Field

- **Spec (Section 3.1):** `LiuNianInput` includes `shenSha: ShenSha[]` — pre-computed birth chart shensha to be used for year-specific shensha determination.

  ```typescript
  interface LiuNianInput {
    baZi: BaZiResult
    shenSha: ShenSha[] // This is in the spec
    currentYear: number
    range: number
  }
  ```

- **Plan (Task 3a):** `LiuNianInput` omits the `shenSha` field entirely:

  ```typescript
  export interface LiuNianInput {
    baZi: BaZiResult
    currentYear: number
    range?: number
  }
  ```

- **Impact:** No year-specific shensha can be computed. The plan generates `const yearShenSha: ShenSha[] = []` (always empty) for every year. Every `LiuNianYear` object will have `shenSha: []`, meaning no 流年驿马, 流年桃花, or any year-specific shensha markers will appear.

- **Plan acknowledgement:** The plan's CLAUDE.md update (Task 7) documents this as a known limitation: "The liunian calculation currently does not compute year-specific shenshas."

- **Verdict:** This is a spec requirement that the plan explicitly does not implement. If year-specific shenshas are essential for Phase 4, this is a blocker. If they are deferred, the spec should be updated to remove `shenSha` from `LiuNianInput` or mark it as "reserved for future use."

### 3. `isFavorable` Logic Bug in calculateLiuNian

- **Plan (Task 3a, line 1194-1195):**

  ```typescript
  const isFavorable =
    favorableElements.includes(stemWuxing) ||
    (!unfavorableElements.includes(stemWuxing) && favorableElements.some(f => stemWuxing === f))
  ```

- **Bug:** The second clause `favorableElements.some(f => stemWuxing === f)` is semantically identical to `favorableElements.includes(stemWuxing)`. When `favorableElements.includes(stemWuxing)` is false, `.some(f => stemWuxing === f)` is also false. The second clause is dead code.

- **Impact:** Neutral elements (those not in `favorableElements` and not in `unfavorableElements`) are scored as -20 (unfavorable) instead of neutral. The spec's scoring algorithm says:
  - "+30 for favorable, -20 for unfavorable" — but neutral elements receive the -20 penalty.
  - Expected behavior: neutral elements should probably score 0 (no addition/subtraction), not -20.

- **Fix:** The logic should be:
  ```typescript
  const isFavorable = favorableElements.includes(stemWuxing)
  const isUnfavorable = unfavorableElements.includes(stemWuxing)
  // Then in scoring: if (isFavorable) score += 30; else if (isUnfavorable) score -= 20; (else 0 for neutral)
  ```
  Or alternatively:
  ```typescript
  const isFavorable =
    favorableElements.includes(stemWuxing) || !unfavorableElements.includes(stemWuxing)
  ```
  if neutral elements should be treated as favorable.

### 4. `getSolarTerm` Call is Dead Code in getMonthlyStems

- **Plan (Task 3a, line 1023):**

  ```typescript
  const liChun = getSolarTerm(year, 0)
  ```

  The variable `liChun` is never used. `getSolarTerm` is imported but the month boundaries are computed purely from sequential indexing, not solar terms.

- **Impact:** The plan acknowledges this in its CLAUDE.md notes: "Precise solar-term-based month boundaries would require integrating `getSolarTerm` for each month within the year." The current implementation uses sequential month numbering, which is approximately correct but not exact for birth dates near solar term boundaries.

- **Fix:** Either use `liChun` to validate month boundaries, or remove the import and the dead code. If deferring precise boundaries, add a TODO comment.

### 5. `getMonthStemStart` Imported but Not Used

- **Plan (Task 3a, line 874):** Imports `getMonthStemStart` from `useSolarTerms.ts`

  ```typescript
  import { getMonthStemStart, getSolarTerm } from './useSolarTerms'
  ```

- **Implementation (line 1019):** Reimplements the formula inline:

  ```typescript
  const monthStemStart = (yearStemIdx * 2 + 2) % 10 // 五虎遁
  ```

- **Impact:** Dead import. The function `getMonthStemStart(yearStemIdx)` from `useSolarTerms.ts` (line 159) returns exactly `(yearStemIndex * 2 + 2) % 10`. This is a code duplication vs reuse issue.

- **Fix:** Replace line 1019 with `const monthStemStart = getMonthStemStart(yearStemIdx)`.

### 6. `buildSummary` Uses a `baZi` Hack Property

- **Plan (Task 3a, lines 1263-1269):**

  ```typescript
  const fullYearInfo: LiuNianYear = {
    ...yearInfo,
    score,
    summary: '',
    baZi: undefined as any, // temporary placeholder for buildSummary
  }
  ;(fullYearInfo as any).baZi = baZi // hack to pass baZi to buildSummary
  fullYearInfo.summary = buildSummary(fullYearInfo, tenGod)
  delete (fullYearInfo as any).baZi
  ```

- **Issue:** This mutates the typed object via `as any`, adds a temporary property, calls a function, then deletes it. Type safety is completely bypassed.

- **Fix:** The plan provides a fix section that refactors `buildSummary` to accept explicit parameters instead of reading `year.baZi`. But the fix section is presented as a separate code block AFTER the main implementation, which is confusing. The main Task 3a code and the fix should be merged into a single correct implementation.

---

## Inconsistencies (Docs Disagree with Each Other)

### 7. 天乙贵人 Lookup Dimension: Spec vs Plan

- **Spec (Section 2.1):** Lists 天乙贵人 under "以年支查" (checked against year branch).
- **Plan (Task 1a, lines 259-266):** Implements 天乙贵人 using `dayStem` (日干), with lookup map `tianYiMap` keyed by day stem.
- **UI Design (Section 2.4):** Shows tooltip source as "日干 · 月柱地支", consistent with the plan, NOT the spec.
- **Plan CLAUDE.md (Task 7):** Acknowledges: "Some shenshas have multiple lookup source variants (e.g. 天乙贵人 has 日干-based and 年干-based versions). This implementation uses the 日干-based version which is the most widely used in 子平法."
- **Verdict:** The plan's implementation (日干) is authoritative from a BaZi theory standpoint; the spec's classification under 年支 is incorrect. The spec should be updated.

### 8. 禄神 Lookup Dimension: Spec vs Plan

- **Spec (Section 2.1):** Lists 禄神 under "以年支查" (checked against year branch).
- **Plan (Task 1a, lines 247-249):** Implements 禄神 using `dayStem` (日干), with lookup map `luShenMap` keyed by day stem.
- **Verdict:** Same issue as 天乙贵人. The 禄神 (also known as 临官/建禄) is correctly determined by 日干 in 子平法. Spec should be updated.

### 9. `EarthRelation.type`: `破` Listed in Spec but Not Implemented

- **Spec (Section 3.1, `EarthRelation.type`):** `type: string // 合/冲/刑/害/破` — includes `破` (destruction/breakage).
- **Plan (Task 3a):** Implements only `合/冲/刑/害`. No `破` relation check exists.
- **Impact:** The `EarthRelation` type accepts any string, so no type error, but `破` relations are never detected.
- **Verdict:** Either implement `破` relations or remove it from the spec's description.

### 10. State Management Approach: `ref` (Plan) vs `computed` (UI Design)

- **UI Design (Section 4.2):** Uses `computed()` for `shenSha` and `liuNian`, which reactively recomputes when `result` changes.
- **Plan (Task 6a):** Uses `ref<ShenSha[]>([])` and `ref<LiuNianYear[]>([])`, manually assigning in `computeResult()`.
- **Impact:** Both approaches functionally work. The `computed` approach is more idiomatic (no manual synchronization needed) and would automatically recompute if the page ever supports editing birth info without a full recompute. The `ref` approach requires remembering to update both state variables in every code path.
- **Recommendation:** Use `computed` as specified in the UI design, which is cleaner for a derivation from a single source of truth (`result`).

### 11. Spec Specifies "流年地支对四柱地支" but Plan Also Checks DayMasterWuxing

- **Spec (Section 3.1):** `earthRelations: EarthRelation[] // 流年地支对四柱地支的关系` — only branch-to-branch.
- **Plan (Task 3a):** Correctly implements branch-to-branch checks only. Consistent.
- **Verdict:** No issue found. (Listed here for audit trail — the scoring algorithm's mention of "与日柱的关系加权 1.5x" is about scoring weight, not a different relation type.)

### 12. `tenGodWuxing` is Redundant with `stemWuxing`

- **Plan (Task 3a, line 1191):** `const tenGodWuxing = WUXING_STEM[stem]` — identical to `stemWuxing` computed two lines earlier.
- **Spec (Section 3.1):** `tenGodWuxing: string // 十神对应的五行（生克关系）`
- **Analysis:** For any given year stem, the ten god's associated element is the stem's own wuxing (because the ten god is defined by the relationship between day master and the year stem). The two fields will always be equal. The spec may have intended this to represent the five-element category of the ten god type itself (e.g., 正官="官杀"="金"), which is a different concept.
- **Recommendation:** Clarify in the spec what `tenGodWuxing` represents. If it is always equal to `stemWuxing`, consider removing it as redundant. If it represents a different concept, the plan implementation is incorrect.

---

## Missing Coverage (Spec Requirement Not in Plan)

### 13. Shensha on 命宫 and 大运 Pillars

- **Spec (Section 2.1, `ShenSha.pillar`):** Union type includes `'命宫' | '大运'`.
- **Plan (Task 1a):** All shensha are assigned to `'年柱' | '月柱' | '日柱' | '时柱'`. No shensha are ever created with `pillar = '命宫'` or `pillar = '大运'`.
- **Impact:** The type allows these values but the implementation never produces them. The test at line 550 checks `.toContain(ss.pillar)` not `.toEqual()`, so tests pass.
- **Verdict:** Either implement 命宫 and 大运 pillar shenshas, or remove them from the spec type. This is acknowledged as a limitation in the plan's CLAUDE.md notes.

### 14. No API Tests

- **Spec (Section 6):** "API：验证 divinations CRUD、认证、速率限制"
- **Plan (Task 5d):** "Since API tests need a running server, we skip automated API tests in this plan"
- **Verdict:** Intentional skip. Acceptable if integration verification is done manually post-implementation, but the spec's test requirement is not met.

### 15. No Component Tests for ShenShaPanel or LiuNianTimeline

- **Spec (Section 6):** Does not explicitly require component tests, but the plan only has composable tests.
- **Verdict:** Acceptable for this phase. Component behavior is verified by the manual verification checklist in the plan.

### 16. `破` Earth Relation Not Implemented

- See Issue #9 above. Spec includes `破`; plan does not implement it.

### 17. Year-Specific Shensha Not Computed

- See Issue #2 above. `LiuNianInput.shenSha` is in the spec; the plan omits it and generates empty arrays.

### 18. `ErathRelation` Relation Templates Repeat `{year}` Verbosely

- **Plan (Task 3a, lines 1000-1005):** `RELATION_DESC_TEMPLATES` has `{year}` placeholder, but the plan's usage at lines 1207/1213/1220/1227 only replaces `{year}`, not any other placeholders.
- **Impact:** Descriptions like "与2026流年地支六合，主合作、姻缘、贵人相助" contain a double reference ("与2026流年地支" and the description body). Minor readability issue, not a bug.

---

## Suggestions (Nice-to-Have Improvements)

### 19. Export `getTenGod` from `useBaZi.ts`

- **Current:** `getTenGod` is a private function in `useBaZi.ts` (line 137, not exported). The plan reimplements it with a near-identical function in `useLiuNian.ts`.
- **Suggestion:** Export `getTenGod` from `useBaZi.ts` and import it in `useLiuNian.ts` to avoid code duplication. This also ensures the ten god matrix stays consistent across all engines.

### 20. Export `WUXING_STEM` and `WUXING_BRANCH` Maps

- **Current:** `WUXING_STEM` and `WUXING_BRANCH` are private in `useBaZi.ts`. The plan duplicates them in `useLiuNian.ts`.
- **Suggestion:** Move these to `constants/bazi.ts` or export them from `useBaZi.ts` as `const` exports (not in the module scope).

### 21. Extract `SHENSHA_DESC` to Constants File

- **Plan (Task 8):** Suggests optionally adding `SHENSHA_CATEGORIES` to `constants/bazi.ts` but notes it's optional.
- **Suggestion:** Move `SHENSHA_DESC` (the descriptions map) to `constants/bazi.ts` to separate data from logic. This makes the descriptions reusable if needed elsewhere (e.g., a shensha reference page).

### 22. Compact Card: Prevent Multiple Cards from Being Expanded Simultaneously

- **Plan (Task 4, `expandedYears`):** Uses `ref(new Set<number>())` and `toggleExpand`, which toggles individual indices but does NOT close previously expanded cards when a new one is clicked.
- **UI Design (Section 3.5.3):** "Only one card is expanded at a time (or none). Clicking a different card closes the previously expanded one."
- **Current behavior:** Multiple cards can be expanded simultaneously (Set allows multiple entries).
- **Fix:** Change `toggleExpand` to: if already in set, delete; otherwise clear the set first, then add.

### 23. `checkSanHeBranch` Fallback for Unknown Branches

- **Plan (Task 1a, lines 85-97):** If `sanHeGroup(yearBranch)` returns -1, the function returns `false`. This is safe but silent.
- **Suggestion:** Add a warning log for debugging purposes, or assert that the input branches are valid.

### 24. `hongLuanMap` Lookup Could Return `undefined`

- **Plan (Task 1a, line 442):** `BRANCHES[(branchIdx(hongLuanMap[yearBranch]) + 6) % 12]` — if `hongLuanMap[yearBranch]` is undefined (unknown year branch), `branchIdx(undefined)` returns -1, `(-1+6)%12 = 5`, returning a wrong branch.
- **Suggestion:** Add a guard: `if (!hongLuanMap[yearBranch]) continue` in the loop.

### 25. `getDaYunForYear` Hardcoded Fallback

- **Plan (Task 3a, lines 1158-1162):** Falls back to `{ stem: '甲', branch: '子' }` if no da yun cycle matches.
- **Suggestion:** Return `null` instead and handle the null case in the UI, rather than silently displaying incorrect da yun info.

### 26. `formatHistoryDate` Uses `new Date()` on ISO Strings

- **Plan (Task 6c, lines 2159-2166):** `new Date(dateStr)` is used. For ISO 8601 strings from SQLite (`created_at`), this works because `new Date("2026-05-25T12:00:00.000Z")` is valid. However, SQLite may store timestamps in different formats.
- **Suggestion:** Use `parseDate`-style manual parsing (split and parseInt) to avoid timezone ambiguity, consistent with the codebase convention documented in CLAUDE.md.

### 27. `scoreColor` Function in LiuNianTimeline Should Be Shared

- **Plan (Task 4):** `scoreColor` function is defined in LiuNianTimeline.vue.
- **UI Design (Section 3.6):** The same color scheme is used for both score rings and score bars.
- **Suggestion:** Extract to a shared utility or composable for DRY. Could be a simple exported function in `constants/bazi.ts` or a new utility.

### 28. `relative group` CSS Pattern for Tooltips

- **Plan (Task 2, ShenShaPanel.vue):** Uses `relative group` + `group-hover:opacity-100` for tooltips.
- **Observation:** This CSS pattern is clean and works well. Consider adding a small `::after` arrow/pointer to the tooltip for polish, though this is purely cosmetic.
- **Priority:** Nit-level. Current implementation is functional.

### 29. Keyboard Navigation for Compact Cards

- **UI Design (Section 3.9):** "Keyboard: Enter/Space on a compact card toggles its expanded state. `tabindex="0"` on each compact card."
- **Plan (Task 4, LiuNianTimeline.vue):** The compact card divs have `@click="toggleExpand(idx)"` but do NOT have `@keydown.enter` or `@keydown.space` handlers, nor `tabindex="0"`.
- **Impact:** Keyboard users cannot expand compact year cards.
- **Suggestion:** Add `@keydown.enter.prevent="toggleExpand(idx)"`, `@keydown.space.prevent="toggleExpand(idx)"`, `tabindex="0"`, and `role="button"` with `:aria-expanded="expandedYears.has(idx)"` to compact card divs.

### 30. `ShenShaPanel` Empty State for "All Empty" Case

- **UI Design (Section 2.3):** "If ALL shensha arrays are empty, show '该命局无特殊神煞标记'"
- **Plan (Task 2):** The component uses `v-if` for each category but does NOT include the "all empty" fallback message.
- **Suggestion:** Add an `v-if="shenSha.length === 0"` block at the top showing the fallback message.

### 31. Missing `aria-describedby` for Shensha Tooltips

- **UI Design (Section 2.6):** Recommends `aria-describedby` or `title` attributes as screen reader fallback for tooltip content.
- **Plan (Task 2):** No `aria-describedby` or `title` attributes on badges.
- **Suggestion:** Add `title={ss.description}` to each badge for basic screen reader support without complex aria architecture.

---

## Verified Correct Items (For Audit Trail)

The following items were checked and found to be correct:

- **`BaZiPillar`, `BaZiResult`, `DaYunCycle` types:** `useBaZi.ts` exports all three. Plan imports `BaZiPillar` and `BaZiResult`. Consistent.
- **`STEMS`, `BRANCHES` constants:** Exported from `constants/bazi.ts`. Plan imports them correctly.
- **`WUXING_COLORS` references:** UI design colors match `tailwind.config.ts` tokens (jade=#4A7C59, cinnabar=#C62828, gold=#B8860B, ink-medium=#6B5B4F, wuxing-metal=#8E8E8E).
- **`getMonthStemStart` signature:** Exported from `useSolarTerms.ts` at line 159 as `(yearStemIndex: number): number`. Plan imports it (though doesn't use it).
- **`getSolarTerm` signature:** Exported from `useSolarTerms.ts`. Plan imports it.
- **`InkDivider` component import:** Both ShenShaPanel and LiuNianTimeline components explicitly import from `~/components/tools/InkDivider.vue`, consistent with the CLAUDE.md Nuxt auto-import caveat.
- **File paths:** All new file paths in the plan match the spec's file change summary, and existing file paths match the project structure in CLAUDE.md.
- **Test command:** `npx vitest run` is correct (not `npm test`).
- **`shenSha` prop mapping:** `:shen-sha="shenShaList"` correctly maps to `defineProps<{ shenSha: ShenSha[] }>()` via Vue's kebab-to-camelCase conversion.
- **`currentYear` prop mapping:** `:current-year="currentYear"` correctly maps to `defineProps<{ currentYear: number }>()`.
- **Tailwind opacity modifiers:** `bg-cinnabar/3` and `border-cinnabar/15` are already used in the existing bazi.vue codebase — confirmed to work with the project's Tailwind config.
- **`fade-in` animation:** Both new components use the existing CSS class with `--delay` custom properties. The CSS is defined in `assets/css/main.css` — no redefinition needed.
- **API path pattern:** `/api/divinations` follows Nuxt's `server/api/` file-based routing convention.
- **Auth pattern:** All API endpoints check `Authorization: Bearer <token>` and call `getProfileIdFromToken(token)`, consistent with the auth flow documented in CLAUDE.md.
- **`getDaYunForYear` age calculation:** Uses `year - baZi.birthYear` which matches `getCurrentAge()` in bazi.vue.
- **`calculateShenSha` `gender` field:** In `ShenShaInput` but never used in the implementation. The spec includes it, and the plan faithfully passes it through without using it. Both documents agree it's present but unused.

---

## Overall Verdict

**NEEDS FIXES**

Four critical issues must be resolved before implementation begins:

1. **Component insertion order conflict** (Issue #1) — The plan places ShenShaPanel in the wrong position relative to the UI design. This directly contradicts both the documented information flow and the delay animation sequence.

2. **Missing `shenSha` in `LiuNianInput`** (Issue #2) — The spec requires passing birth chart shensha to liunian calculation. The plan omits it entirely and generates empty shensha arrays. Either the spec should be updated to defer this, or the plan should implement it.

3. **`isFavorable` logic bug** (Issue #3) — The dead-code clause means neutral elements (not in either favorable or unfavorable list) are scored as unfavorable (-20), which contradicts the scoring algorithm's intent.

4. **`buildSummary` hack** (Issue #6) — The `as any` mutation pattern needs to be replaced with the clean refactored version before code is committed. The plan's "fix" section should be merged into the main implementation code.

Additionally, the spec should be updated to correct the lookup dimensions for 天乙贵人 and 禄神 (Issues #7, #8), which are correctly implemented in the plan as 日干-based but incorrectly documented as 年支-based in the spec.

The plan's self-review checklist is overly optimistic — it claims "every requirement has a task" and "no placeholders," but the `shenSha` gap in LiuNianInput and the `buildSummary` hack constitute significant implementation gaps.
