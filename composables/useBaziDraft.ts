import { computed, ref, shallowRef } from 'vue'
import { BAZI_ERROR_CODES, BAZI_FAILURE_REASONS } from '~/constants/bazi-rules'
import type {
  BaziCalendar,
  BaziDomainResult,
  BaziDraftState,
  BaziInputOrigin,
  BaziRawDate,
} from '~/types/bazi'
import type { ToolResultState } from '~/types/tool-result'
import { calculateBazi } from '~/utils/bazi/engine'
import { parseDateString, toIsoDate } from '~/utils/shengxiao/date'

/**
 * 八字页当次草稿（R5 六段页面的 Ⅱ 段状态）。
 *
 * 边界（治理规范 §7.3/§7.4、契约 §7.2、数据规范 §15.2）：
 * - 全部状态只在本组合式函数的私有 ref 中：不写 localStorage / sessionStorage /
 *   URL / 日志，刷新或离开即清除；
 * - **无任何默认值**：不预填今天、不预填示例日期、不默认普通月；
 * - 修改任一参与计算的字段后：已有成功结果**保留**并标记 stale，由用户主动重新生成，
 *   不自动重算；旧的失败结果属于旧输入，输入一改即清除（避免把旧错误挂在新输入上）；
 * - 十四周岁声明是第一道门：未确认时不产生任何个人日期计算，但公共说明仍可阅读；
 * - 不读取系统时钟：`asOfDate` 由调用方通过 `options.asOfDate()` 提供（Asia/Shanghai 当日）；
 * - 越界与非法日期由引擎判定为失败，其用户可见文案在本模块同时写入输入区就近错误，
 *   与 Ⅲ 段状态横幅共用 `BAZI_FAILURE_REASONS`，避免两处中文串漂移。
 *
 * @author LiXinwen
 */

/** 一次生成产物：输入、生成当日、状态与结果（失败时 result 为 null）。 */
export interface BaziGeneration {
  raw: BaziRawDate
  asOfDate: string
  /**
   * 本次生成的稳定幂等标识：同一次生成重复保存只产生一条记录（治理规范 §11.6）。
   * 在生成时确定，重试复用同一个值，不因失败重试而改变。
   */
  resultId: string
  state: ToolResultState
  result: BaziDomainResult | null
}

export interface UseBaziDraftOptions {
  /**
   * 产品「今天」getter（Asia/Shanghai 公历日期，YYYY-MM-DD）。
   * 由页面在提交时刷新并传入，本模块不读系统时钟。
   */
  asOfDate: () => string
}

/** 空草稿：所有字段无默认值，闰月状态为「未选」。 */
function emptyDraft(): BaziDraftState {
  return {
    calendar: 'solar',
    year: '',
    month: '',
    day: '',
    isLeapMonth: null,
    ageConfirmed: false,
  }
}

/** 本次生成的幂等标识：优先用 randomUUID，缺失时退回时间 + 随机数（仍唯一可重试复用）。 */
function createResultId(): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID()
  return `bazi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useBaziDraft(options: UseBaziDraftOptions) {
  const draft = ref<BaziDraftState>(emptyDraft())
  /** 输入来源：手填或本次从本人档案显式带入（保存快照时写入 inputOrigin）。 */
  const origin = ref<BaziInputOrigin>('manual')
  /** 输入区就近错误（结构不完整、闰月未选、十四周岁未确认、越界等）。 */
  const inputError = ref('')
  const generation = shallowRef<BaziGeneration | null>(null)
  const stale = ref(false)
  /**
   * 草稿修订号：输入每次变化递增。页面在 await 前后比对，
   * 防止异步续体把旧输入的生成结果落到新输入上。
   */
  const revision = ref(0)
  let revisionCounter = 0

  const result = computed(() => generation.value?.result ?? null)
  const hasResult = computed(() => generation.value !== null)
  const missingLeapChoice = computed(
    () => draft.value.calendar === 'lunar' && draft.value.isLeapMonth === null,
  )
  const fieldsComplete = computed(
    () => draft.value.year !== '' && draft.value.month !== '' && draft.value.day !== '',
  )
  /** 是否满足提交前提（完整日期 + 闰月已选 + 已确认十四周岁）。 */
  const canGenerate = computed(
    () => fieldsComplete.value && !missingLeapChoice.value && draft.value.ageConfirmed,
  )

  /**
   * 对外的当次状态：stale 只加在成功结果上。
   * 失败状态直接透传，避免「输入已修改」把失败类别盖掉。
   */
  const state = computed<ToolResultState>(() => {
    const current = generation.value
    if (!current) return { phase: 'idle' }
    if (stale.value && current.state.phase === 'success') {
      return {
        phase: 'success',
        successQualifier: current.state.successQualifier,
        freshness: 'stale',
      }
    }
    return current.state
  })

  /** stale 时展示旧结果所用的输入摘要（用户可见的原始表达）。 */
  const staleInputSummary = computed(
    () => generation.value?.result?.dateComparison.originalExpression ?? '',
  )

  /** 候选情形涉及的「节」名（Ⅲ 段与 Ⅳ 段逐项对比共用）。 */
  const boundaryTerm = computed(() => generation.value?.result?.uncertainty?.boundary.term ?? '')

  /** 递增修订号（每次输入变化都调用，供页面做异步过期判断）。 */
  function bumpRevision(): number {
    revisionCounter++
    revision.value = revisionCounter
    return revisionCounter
  }

  /**
   * 输入变化后的结果处置：
   * - 已生成成功结果：保留结果并标记 stale，不自动重算；
   * - 旧失败结果：直接清除（它属于旧输入）。
   */
  function touch() {
    inputError.value = ''
    if (!generation.value) return
    if (generation.value.state.phase === 'success') {
      stale.value = true
      return
    }
    generation.value = null
    stale.value = false
  }

  function setCalendar(value: BaziCalendar) {
    if (draft.value.calendar === value) return
    // 切换历法不把同一组数字静默解释为另一历法：清空并重新填写；
    // 切到农历时闰月状态回到「未选」，必须由用户显式选择（契约 §7.2）。
    draft.value.calendar = value
    draft.value.year = ''
    draft.value.month = ''
    draft.value.day = ''
    draft.value.isLeapMonth = null
    touch()
    bumpRevision()
  }

  function setYear(value: string) {
    draft.value.year = value
    touch()
    bumpRevision()
  }

  function setMonth(value: string) {
    draft.value.month = value
    touch()
    bumpRevision()
  }

  function setDay(value: string) {
    draft.value.day = value
    touch()
    bumpRevision()
  }

  function setLeapMonth(value: boolean) {
    // 闰月状态只允许显式选择：不接受 undefined/null 作为「默认普通月」。
    draft.value.isLeapMonth = value
    touch()
    bumpRevision()
  }

  function setAgeConfirmed(value: boolean) {
    draft.value.ageConfirmed = value
    if (value) inputError.value = ''
    bumpRevision()
  }

  function setOrigin(value: BaziInputOrigin) {
    origin.value = value
  }

  /** 结构化输入：只产出合法 `BaziRawDate`，不合法时给出就近文案。 */
  function buildRaw(): { ok: true; raw: BaziRawDate } | { ok: false; error: string } {
    const current = draft.value
    if (!current.year || !current.month || !current.day) {
      return { ok: false, error: '请选择完整的年、月、日' }
    }
    const year = Number(current.year)
    const month = Number(current.month)
    const day = Number(current.day)
    if (current.calendar === 'solar') {
      const iso = toIsoDate(year, month, day)
      if (!parseDateString(iso)) {
        return { ok: false, error: '请输入真实存在的公历日期（注意闰年二月二十九日）' }
      }
      return { ok: true, raw: { calendar: 'solar', year, month, day, isLeapMonth: null } }
    }
    if (current.isLeapMonth === null) {
      return { ok: false, error: '农历月份请明确选择「普通月」或「闰月」' }
    }
    return {
      ok: true,
      raw: { calendar: 'lunar', year, month, day, isLeapMonth: current.isLeapMonth },
    }
  }

  /** 失败状态的用户可见文案（与状态横幅共用同一张表）。 */
  function failureReason(failureDetailCode?: string): string {
    const code = failureDetailCode ?? ''
    return BAZI_FAILURE_REASONS[code] ?? '未能生成结果，请检查出生日期后重试'
  }

  /**
   * 主动生成（只有用户点击才计算）。
   * @returns 本次生成产物；未通过前置门（十四周岁、结构校验）时返回 null 且不落结果。
   */
  function generate(): BaziGeneration | null {
    // 第一道门：未确认已满十四周岁不产生个人日期计算（数据规范 §5.4）。
    if (!draft.value.ageConfirmed) {
      inputError.value = '提交个人日期计算前，请先确认已满十四周岁'
      return null
    }
    const built = buildRaw()
    if (!built.ok) {
      inputError.value = built.error
      return null
    }
    const asOfDate = options.asOfDate()
    if (!asOfDate) {
      // 无法确定查询当日属环境错误：不猜测「今天」，也不回退默认日期。
      const failed: BaziGeneration = {
        raw: built.raw,
        asOfDate: '',
        resultId: createResultId(),
        state: { phase: 'failure', failureCategory: 'engine_error' },
        result: null,
      }
      generation.value = failed
      stale.value = false
      inputError.value = failureReason(BAZI_ERROR_CODES.ENGINE_ERROR)
      return failed
    }
    const outcome = calculateBazi({ raw: built.raw, asOfDate })
    const next: BaziGeneration = {
      raw: built.raw,
      asOfDate,
      resultId: createResultId(),
      state: outcome.state,
      result: outcome.result,
    }
    generation.value = next
    stale.value = false
    inputError.value =
      outcome.state.phase === 'failure' ? failureReason(outcome.state.failureDetailCode) : ''
    return next
  }

  /** 档案带入/撤销使用：整组替换字段值（不触发计算，只把旧结果标 stale）。 */
  function applyRaw(raw: BaziRawDate) {
    draft.value.calendar = raw.calendar
    draft.value.year = String(raw.year)
    draft.value.month = String(raw.month)
    draft.value.day = String(raw.day)
    draft.value.isLeapMonth = raw.calendar === 'lunar' ? raw.isLeapMonth : null
    touch()
    bumpRevision()
  }

  /** 清空出生日期字段与结果，但保留历法选择与十四周岁声明（档案来源失效时使用）。 */
  function clearFields() {
    draft.value.year = ''
    draft.value.month = ''
    draft.value.day = ''
    draft.value.isLeapMonth = null
    inputError.value = ''
    generation.value = null
    stale.value = false
    bumpRevision()
  }

  /** 清空草稿与结果（页面卸载、退出登录、账号切换时调用）。 */
  function reset() {
    draft.value = emptyDraft()
    origin.value = 'manual'
    inputError.value = ''
    generation.value = null
    stale.value = false
    bumpRevision()
  }

  return {
    draft,
    origin,
    inputError,
    generation,
    stale,
    revision,
    result,
    hasResult,
    state,
    staleInputSummary,
    boundaryTerm,
    fieldsComplete,
    missingLeapChoice,
    canGenerate,
    setCalendar,
    setYear,
    setMonth,
    setDay,
    setLeapMonth,
    setAgeConfirmed,
    setOrigin,
    buildRaw,
    failureReason,
    generate,
    applyRaw,
    clearFields,
    reset,
  }
}
