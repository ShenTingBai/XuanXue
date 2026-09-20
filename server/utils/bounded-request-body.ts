/**
 * 有界原始请求体读取（2026-09-20；v2 收敛连接生命周期；v3 补回预缓冲兼容）。
 *
 * 体积上限必须在**流读取阶段**生效，而不是整包读完后判定：
 * h3 的 `readRawBody` 会把全部 chunk 收集后 `Buffer.concat`，chunked 请求
 * （无 Content-Length）在判定 413 之前就可能耗尽内存。
 *
 * 按**请求体来源**分三种情况处理：
 *
 * 1. **h3 已明确预缓冲**（`event._requestBody`、`event.web.request.body`、
 *    `Symbol.for('h3RawBody')`、`req.rawBody`、`req.body`）——这些值由上游框架
 *    或中间件在进入本 helper 前固定下来，**不是** live socket。此时直接交给
 *    h3 `readRawBody(event, false)` 转换（Buffer/string/object 等），再按
 *    maxBytes 校验字节数。此路径不触碰 socket，不存在流式内存风险。
 *    预缓冲值若是流对象（ReadableStream / Node stream），**不能**当作普通 Buffer，
 *    必须交给下面的流路径逐块受限处理。
 *
 * 2. **live Node IncomingMessage**（具备 on/off/resume 且尚未结束）——直接监听
 *    `data/end/error/aborted` 累计字节。超限时**不 pause、不取消 h3 包装流**，
 *    而是移除本 helper 注册的全部监听后调用 `req.resume()` 排空剩余请求体，
 *    使连接能正常结束或复用。原因（v2 实测）：v1 的 `pause + cancel` 会留下
 *    未消费请求体，慢速大请求下同一 keep-alive socket 被长期占用，后续请求被迫
 *    等待并新建连接；而 h3 包装流在 cancel 后仍持有 `data` 监听，继续向已取消的
 *    controller enqueue 会抛未捕获的 ERR_INVALID_STATE。
 *
 * 3. **Web Request / ReadableStream**——按 `reader.read()` 累计，
 *    超限时 `reader.cancel()` 并释放 lock。
 *
 * 边界：Node 请求若 `readableEnded` 为真且没有任何预缓冲体，说明请求体已被上游消费
 * 且无处可取——此时返回 null（空体语义），**不能**注册监听去等一个永远不会再触发的事件
 * （v2 的缺陷：晚注册导致永久 pending）。注意 `complete` 标志不能替代 `readableEnded`：
 * 前者只表示 HTTP message 收完，数据可能仍在 readable 缓冲区中待读。
 *
 * 三条路径共享相同的 413、空体、UTF-8 解码与错误传播语义。
 *
 * @author LiXinwen
 */

import { assertMethod, getRequestWebStream, readRawBody } from 'h3'
import type { H3Event } from 'h3'

/** 可携带请求体的方法，与 h3 readRawBody 的断言范围保持一致。 */
const PAYLOAD_METHODS = ['PATCH', 'POST', 'PUT', 'DELETE'] as const

/**
 * h3 用于缓存已读请求体的 Symbol 键。
 * 与 h3 readRawBody 内部使用的 `Symbol.for('h3RawBody')` 保持同一注册表键。
 */
const RawBodySymbol = Symbol.for('h3RawBody')

/** Node Readable 的最小能力集合：具备它才走直读路径。 */
interface NodeReadableRequest {
  on(event: string, listener: (...args: unknown[]) => void): unknown
  off(event: string, listener: (...args: unknown[]) => void): unknown
  resume(): unknown
  /** 请求体是否已被读完（Node 语义）。 */
  readableEnded?: boolean
  /** 整个 HTTP message 是否已完整接收。 */
  complete?: boolean
}

/**
 * 按真实字节读取请求体，超过 maxBytes 立即拒绝。
 *
 * - 累计字节超过 maxBytes → 停止缓存、清理监听、排空剩余请求体、抛固定 413
 * - 无可用请求流（已被上游完整缓冲或合成事件）→ 返回 null
 * - 空体 → 返回 null，由调用方按空体语义处理
 * - 非请求体方法 → 沿用 h3 的 405 断言
 * - 流读取错误 → 原样传播，不伪装成 413
 */
export async function readBoundedRawBody(
  event: H3Event,
  maxBytes: number,
): Promise<string | null> {
  assertMethod(event, [...PAYLOAD_METHODS])

  // ① h3 已明确预缓冲的请求体。取值顺序与 h3 readRawBody 一致。
  const preBuffered = getPreBufferedBody(event)

  // ① a. 预缓冲的**流**对象优先于 live Node 路径：请求体已被上游放到流里，
  //       此时 node.req 通常是已结束的 socket，注册监听会永久等不到事件。
  if (preBuffered !== undefined && isStreamLike(preBuffered)) {
    return readStreamLike(preBuffered, maxBytes)
  }

  // ① b. 预缓冲的 Buffer/string/object：交给 readRawBody 做既有语义转换
  //       （非 live socket，无流式内存风险），转换后仍按 maxBytes 校验。
  if (preBuffered !== undefined) {
    return readPreBufferedBody(event, maxBytes)
  }

  const nodeRequest = getNodeReadableRequest(event)
  if (nodeRequest) {
    // ② 只有 `readableEnded === true` 才表示 readable 已消费完、数据不可再取。
    //
    //    不能用 `complete` 标志代替：它只表示 HTTP message 已完整接收，
    //    此时数据可能仍停在 readable 缓冲区里（实测：message 完整但 readable 未结束时
    //    readableLength=1024）。若按该标志提前返回 null，会丢掉整段请求体。
    //
    //    该分支仅用于避免"晚注册监听后永久 pending"（v2 缺陷）：readableEnded 为真
    //    且无预缓冲体时，请求体已被上游消费且无处可取，按空体语义返回 null。
    if (nodeRequest.readableEnded === true) {
      return null
    }
    return readFromNodeRequest(nodeRequest, maxBytes)
  }

  // ③ Web Request / ReadableStream 路径
  return readFromWebStream(event, maxBytes)
}

/**
 * 读取 h3 已预缓冲的请求体。
 *
 * 仅当值**不是**流对象时才走这里：Buffer/string/object 等已被上游固定，
 * 不存在"读取过程中增长"的内存风险，交给 h3 readRawBody 做既有语义转换
 * （object → JSON、URLSearchParams → 查询串等），保持与旧实现等价。
 * 转换后仍按 maxBytes 校验真实字节，超限同样 413。
 */
async function readPreBufferedBody(event: H3Event, maxBytes: number): Promise<string | null> {
  const buff = await readRawBody(event, false)
  if (buff === undefined) return null
  const buffer = Buffer.isBuffer(buff) ? buff : Buffer.from(buff)
  if (buffer.byteLength > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: '请求体过大' })
  }
  return buffer.byteLength === 0 ? null : buffer.toString('utf-8')
}

/**
 * 列出 h3 认为"已存在请求体"的来源，与 h3 readRawBody 的取值顺序**和 truthy 语义**
 * 保持一致。
 *
 * 必须用 truthy 判定而非 nullish：h3 原实现是 `a || b || c`，因此空字符串、0、false
 * 都被视为"没有预缓冲体"并继续读 socket。若这里用 `??`，空串会被当成有效候选，
 * 进而触发 `readPreBufferedBody` → `readRawBody` 去**重新完整读取 live socket**，
 * 把已修掉的完整缓冲漏洞带回来。
 *
 * 返回 undefined 表示没有任何可用的预缓冲值（此时才可能走 live socket 读取）。
 */
function getPreBufferedBody(event: H3Event): unknown {
  // H3Event 的公开类型未声明这些预缓冲字段（h3 运行时按约定挂载），
  // 故经 unknown 中转再按结构读取，避免 TS2352。
  const e = event as unknown as {
    _requestBody?: unknown
    web?: { request?: { body?: unknown } }
    node?: { req?: Record<PropertyKey, unknown> }
  }
  const req = e.node?.req
  const candidates = [
    e._requestBody,
    e.web?.request?.body,
    req?.[RawBodySymbol],
    req?.['rawBody'],
    req?.['body'],
  ]
  // 与 h3 一致：取第一个 truthy 值；全部为空值时返回 undefined（无预缓冲）
  for (const candidate of candidates) {
    if (candidate) return candidate
  }
  return undefined
}

/** 流对象判定：Web ReadableStream 或 Node Readable（有 pipe/pipeTo）。 */
function isStreamLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const v = value as { getReader?: unknown; pipeTo?: unknown; pipe?: unknown }
  return (
    typeof v.getReader === 'function' ||
    typeof v.pipeTo === 'function' ||
    typeof v.pipe === 'function'
  )
}

/** 预缓冲的流对象：Web 流走 reader 路径；Node 流走监听路径。 */
function readStreamLike(value: unknown, maxBytes: number): Promise<string | null> {
  const v = value as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> }
  if (typeof v.getReader === 'function') {
    return readFromReader(v.getReader(), maxBytes)
  }
  // Node stream：复用 Node 直读语义（含超限 resume 排空）
  return readFromNodeRequest(value as NodeReadableRequest, maxBytes)
}

/**
 * Node 直读：本 helper 自持监听，超限后清理并排空。
 *
 * settle 只允许发生一次：晚到的 data/end/error/aborted 既不能二次 settle，
 * 也不能重新开始缓存（否则超限判定会被后续事件绕过）。
 */
function readFromNodeRequest(
  req: NodeReadableRequest,
  maxBytes: number,
): Promise<string | null> {
  return new Promise<string | null>((resolve, reject) => {
    let settled = false
    let totalBytes = 0
    const chunks: Buffer[] = []

    const cleanup = () => {
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('error', onError)
      req.off('aborted', onAborted)
    }
    /** 标记已结束并清理监听；返回 false 表示此前已 settle，调用方应直接返回。 */
    const beginSettle = (): boolean => {
      if (settled) return false
      settled = true
      cleanup()
      return true
    }

    const onData = (chunk: unknown) => {
      if (settled) return
      const buf = toBuffer(chunk)
      if (!buf) return

      totalBytes += buf.byteLength
      if (totalBytes > maxBytes) {
        // 超限：先清理自身监听，再排空剩余请求体，最后拒绝。
        // resume() 让 Node 继续消费并丢弃后续 chunk，连接得以正常结束或复用；
        // 若只 pause 不 resume，未消费的请求体会一直占住这条 keep-alive socket。
        if (!beginSettle()) return
        req.resume()
        reject(createError({ statusCode: 413, statusMessage: '请求体过大' }))
        return
      }
      chunks.push(buf)
    }
    const onEnd = () => {
      if (!beginSettle()) return
      resolve(chunks.length === 0 ? null : Buffer.concat(chunks).toString('utf-8'))
    }
    const onError = (err: unknown) => {
      if (!beginSettle()) return
      // Node error 事件类型未声明为 Error；保留标准错误对象，避免把字符串等
      // 非错误值直接作为 Promise rejection reason 传播到 Nitro 边界。
      reject(err instanceof Error ? err : new Error(String(err)))
    }
    const onAborted = () => {
      if (!beginSettle()) return
      reject(new Error('请求已中止'))
    }

    req.on('data', onData)
    req.on('end', onEnd)
    req.on('error', onError)
    req.on('aborted', onAborted)
  })
}

/** Web Stream 路径：按 reader.read() 累计，超限时 cancel 并释放 lock。 */
async function readFromWebStream(event: H3Event, maxBytes: number): Promise<string | null> {
  const stream = getWebRequestStream(event)
  if (!stream) return null
  return readFromReader(stream.getReader(), maxBytes)
}

/** 按 reader 逐块累计的共享实现：Web 请求流与预缓冲 Web 流共用同一受限语义。 */
async function readFromReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
): Promise<string | null> {
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value.byteLength === 0) continue

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => {
          // 取消失败不影响拒绝语义：已判定超限，必须返回 413
        })
        throw createError({ statusCode: 413, statusMessage: '请求体过大' })
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  if (chunks.length === 0) return null
  return Buffer.concat(chunks).toString('utf-8')
}

/** 取得具备 on/off/resume 能力的 Node 请求对象；否则返回 undefined 走 Web 路径。 */
function getNodeReadableRequest(event: H3Event): NodeReadableRequest | undefined {
  const req = (event as { node?: { req?: unknown } }).node?.req
  if (!req || typeof req !== 'object') return undefined

  const candidate = req as Partial<NodeReadableRequest>
  if (
    typeof candidate.on === 'function' &&
    typeof candidate.off === 'function' &&
    typeof candidate.resume === 'function'
  ) {
    return candidate as NodeReadableRequest
  }
  return undefined
}

/**
 * 取得 Web 请求流。
 *
 * h3 的 getRequestWebStream 对非请求体方法返回 undefined；合成事件缺少 node.req
 * 时它会抛错——此处不把该错误静默当作空体，而是让其向上传播，
 * 以免真实运行时异常被伪装成"请求体为空"。
 */
function getWebRequestStream(event: H3Event): ReadableStream<Uint8Array> | undefined {
  const candidate = getRequestWebStream(event)
  if (candidate && typeof (candidate as ReadableStream).getReader === 'function') {
    return candidate as ReadableStream<Uint8Array>
  }
  return undefined
}

/** Node chunk 归一化为 Buffer；非字节内容返回 undefined。 */
function toBuffer(chunk: unknown): Buffer | undefined {
  if (Buffer.isBuffer(chunk)) return chunk
  if (chunk instanceof Uint8Array) return Buffer.from(chunk)
  if (typeof chunk === 'string') return Buffer.from(chunk, 'utf-8')
  return undefined
}
