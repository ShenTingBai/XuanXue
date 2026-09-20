import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import http from 'node:http'
import { createEvent } from 'h3'
import { readBoundedRawBody } from '~/server/utils/bounded-request-body'

/**
 * Node 请求连接生命周期的**真实 HTTP** 回归（v2）。
 *
 * 背景：v1 的超限分支是 `pause()` + 取消 h3 包装流。它虽能返回 413，但既没有
 * 排空剩余请求体，也没有移除包装流的 data 监听——未消费的数据会一直占住
 * keep-alive socket，且 cancel 后包装流继续 enqueue 会抛未捕获的 ERR_INVALID_STATE。
 *
 * 本文件用真实 `node:http` + `Transfer-Encoding: chunked`（无 Content-Length）
 * 请求驱动**生产实现**，并断言**能区分「排空」与「仅暂停」的确定性信号**：
 * 超限响应后请求体必须被真正消费完（`readableEnded === true` 且无残留字节）。
 * 只断言「返回 413」是不够的——实测 v1 的 pause 实现同样返回 413 且客户端无感。
 *
 * 测试监听随机端口；服务器/agent/监听在 afterEach 中清理；不创建数据库文件。
 */

// Nuxt 运行时自动导入的 createError 在纯测试环境不存在；注入带状态码的替身，
// 让生产模块抛出的 413 能被服务器 handler 正确映射为响应状态。
vi.hoisted(() => {
  vi.stubGlobal(
    'createError',
    (args: { statusCode?: number; statusMessage?: string }) =>
      Object.assign(new Error(args?.statusMessage ?? 'error'), {
        statusCode: args?.statusCode,
        statusMessage: args?.statusMessage,
      }),
  )
})

const OVERSIZE_LIMIT = 1024
/** 单个用例整体上限：任何永久暂停都会在这里超时暴露。 */
const CASE_TIMEOUT_MS = 15_000
/** 连接健康度采样间隔。 */


interface SendResult {
  status: number
  body: string
  reused: boolean
}

/** 超限请求在连接关闭时的健康度：请求体是否被消费完。 */
interface RequestHealth {
  readableEnded: boolean
  readableLength: number
  /** 请求体是否被完整接收（Node 语义：整个 message 已完整解析）。 */
  complete: boolean
}

describe('readBoundedRawBody 真实 Node HTTP 生命周期', () => {
  let server: Server | undefined
  let agent: http.Agent | undefined
  let uncaught: string | null = null
  let onUncaught: ((err: Error & { code?: string }) => void) | undefined
  /** 每个超限请求的连接健康度采样结果。 */
  const healthSamples: RequestHealth[] = []

  afterEach(async () => {
    if (onUncaught) process.off('uncaughtException', onUncaught)
    onUncaught = undefined
    agent?.destroy()
    agent = undefined
    if (server) {
      await new Promise<void>(resolve => server!.close(() => resolve()))
      server = undefined
    }
    healthSamples.length = 0
  })

  /**
   * 启动本地服务器：handler 走生产实现，并在请求结束时采样连接健康度。
   * 采样在响应之后进行，因此反映的是"超限分支是否排空了剩余请求体"。
   */
  async function startServer(): Promise<number> {
    uncaught = null
    onUncaught = (err: Error & { code?: string }) => {
      uncaught = err.code ?? err.message
    }
    process.on('uncaughtException', onUncaught)

    server = createServer((req, res) => {
      // 在连接关闭时同步读取健康度：这是区分「排空」与「仅暂停」的可靠时点。
      // v2 排空后：readableEnded=true、readableLength=0、complete=true；
      // v1 的 pause-不-resume 会留下未消费字节（实测 65536）。
      req.on('close', () => {
        healthSamples.push({
          readableEnded: req.readableEnded,
          readableLength: req.readableLength,
          complete: req.complete,
        })
      })

      void (async () => {
        try {
          const event = createEvent(req, res)
          const raw = await readBoundedRawBody(event, OVERSIZE_LIMIT)
          res.statusCode = 200
          res.end(`ok:${raw === null ? 'null' : raw.length}`)
        } catch (err: unknown) {
          const e = err as { statusCode?: number }
          res.statusCode = e.statusCode ?? 500
          res.end(String(e.statusCode ?? 'error'))
        }
      })()
    })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    return (server!.address() as { port: number }).port
  }

  /**
   * 启动"请求体已被上游消费"的服务器：handler 等到 socket 读完（`end`）后
   * 才调用 helper，复现 `readableEnded === true` 且无预缓冲体的场景。
   */
  async function startFinishedServer(): Promise<number> {
    uncaught = null
    onUncaught = (err: Error & { code?: string }) => {
      uncaught = err.code ?? err.message
    }
    process.on('uncaughtException', onUncaught)

    server = createServer((req, res) => {
      // 先把请求体读干净（模拟上游中间件消费），再交给 helper
      req.resume()
      req.on('end', () => {
        void (async () => {
          try {
            const event = createEvent(req, res)
            const raw = await readBoundedRawBody(event, OVERSIZE_LIMIT)
            res.statusCode = 200
            res.end(`ok:${raw === null ? 'null' : raw.length}`)
          } catch (err: unknown) {
            const e = err as { statusCode?: number }
            res.statusCode = e.statusCode ?? 500
            res.end(String(e.statusCode ?? 'error'))
          }
        })()
      })
    })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    return (server!.address() as { port: number }).port
  }

  /**
   * 启动"上游已预缓冲"的服务器：handler 先把请求体读成 Buffer 挂到 `req.rawBody`，
   * 再调用 helper，复现中间件预缓冲后 socket 已消费的兼容场景。
   */
  async function startPreBufferedServer(): Promise<number> {
    uncaught = null
    onUncaught = (err: Error & { code?: string }) => {
      uncaught = err.code ?? err.message
    }
    process.on('uncaughtException', onUncaught)

    server = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', c => chunks.push(c as Buffer))
      req.on('end', () => {
        // 预缓冲：模拟 h3 的 Symbol.for('h3RawBody') 或 req.rawBody 兼容来源
        ;(req as unknown as { rawBody: Buffer }).rawBody = Buffer.concat(chunks)
        void (async () => {
          try {
            const event = createEvent(req, res)
            const raw = await readBoundedRawBody(event, OVERSIZE_LIMIT)
            res.statusCode = 200
            res.end(`ok:${raw === null ? 'null' : raw.length}`)
          } catch (err: unknown) {
            const e = err as { statusCode?: number }
            res.statusCode = e.statusCode ?? 500
            res.end(String(e.statusCode ?? 'error'))
          }
        })()
      })
    })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    return (server!.address() as { port: number }).port
  }

  /**
   * 启动"message 已完整接收但 readable 尚未消费"的服务器：handler 等到客户端把
   * 请求体全部发完（`complete === true`）后**才开始**读取，复现
   * `complete=true / readableEnded=false` 且数据停在 readable 缓冲区的场景。
   */
  async function startBufferedServer(): Promise<number> {
    uncaught = null
    onUncaught = (err: Error & { code?: string }) => {
      uncaught = err.code ?? err.message
    }
    process.on('uncaughtException', onUncaught)

    server = createServer((req, res) => {
      // 轮询等待 message 收完（数据尚未被消费），再交给 helper
      const waitComplete = () => {
        if (req.complete) {
          void (async () => {
            try {
              const event = createEvent(req, res)
              const raw = await readBoundedRawBody(event, OVERSIZE_LIMIT)
              res.statusCode = 200
              res.end(`ok:${raw === null ? 'null' : raw.length}`)
            } catch (err: unknown) {
              const e = err as { statusCode?: number }
              res.statusCode = e.statusCode ?? 500
              res.end(String(e.statusCode ?? 'error'))
            }
          })()
          return
        }
        setTimeout(waitComplete, 1)
      }
      waitComplete()
    })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    return (server!.address() as { port: number }).port
  }

  /**
   * 启动"上游设置了空 _requestBody"的服务器：复现 h3 truthy 链下空值应被视为
   * 无预缓冲、继续走 live 直读的场景（不能触发 readRawBody 重新读 socket）。
   */
  async function startEmptyPreBufferServer(): Promise<number> {
    uncaught = null
    onUncaught = (err: Error & { code?: string }) => {
      uncaught = err.code ?? err.message
    }
    process.on('uncaughtException', onUncaught)

    server = createServer((req, res) => {
      // 空字符串预缓冲：h3 的 truthy 链会忽略它
      ;(req as unknown as Record<string, unknown>).rawBody = ''
      void (async () => {
        try {
          const event = createEvent(req, res)
          const raw = await readBoundedRawBody(event, OVERSIZE_LIMIT)
          res.statusCode = 200
          res.end(`ok:${raw === null ? 'null' : raw.length}`)
        } catch (err: unknown) {
          const e = err as { statusCode?: number }
          res.statusCode = e.statusCode ?? 500
          res.end(String(e.statusCode ?? 'error'))
        }
      })()
    })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    return (server!.address() as { port: number }).port
  }

  /** 以 chunked 方式发送若干块；返回状态、响应体与 socket 是否复用。 */
  function sendChunked(
    port: number,
    chunks: Buffer[],
    keepAliveAgent: http.Agent,
  ): Promise<SendResult> {
    return new Promise<SendResult>((resolve, reject) => {
      const req = http.request(
        {
          port,
          host: '127.0.0.1',
          path: '/',
          method: 'POST',
          agent: keepAliveAgent,
          // 显式声明 chunked：不带 Content-Length，走本修复针对的路径
          headers: { 'transfer-encoding': 'chunked' },
        },
        res => {
          let body = ''
          res.setEncoding('utf-8')
          res.on('data', d => {
            body += d
          })
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body, reused: req.reusedSocket }),
          )
        },
      )
      req.on('error', reject)
      for (const chunk of chunks) req.write(chunk)
      req.end()
    })
  }

  /**
   * 等待连接关闭并返回其健康度。
   *
   * 这是区分「排空」与「仅暂停」的确定性信号：v1 的 pause-不-resume 会在
   * `complete` 上留下 false / 残留字节，最终在这里超时失败；v2 排空后立即满足。
   */
  async function waitForDrain(timeoutMs = 6000): Promise<RequestHealth> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const latest = healthSamples[healthSamples.length - 1]
      if (latest) return latest
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    throw new Error(`连接在 ${timeoutMs}ms 内未关闭，无法确认请求体是否被排空`)
  }

  it(
    'chunked 超限返回 413 且请求体被排空，同一 keep-alive agent 的合法请求可复用连接',
    async () => {
      const port = await startServer()
      agent = new http.Agent({ keepAlive: true, maxSockets: 1 })

      // 1) 无 Content-Length 的超限请求：一次写入 512KB，远超 socket 缓冲。
      //    这个规模是必要的：小请求体会被 socket 缓冲吸收，pause 与 resume 从外部
      //    看不出差别；512KB 时 v1 的 pause 会留下 64KB 未消费字节（实测）。
      const oversized = await sendChunked(port, [Buffer.alloc(512 * 1024, 120)], agent)
      expect(oversized.status).toBe(413)

      // 2) 确定性信号：请求体必须被完整消费（v1 的 pause 实现会留下残留字节）
      const health = await waitForDrain()
      expect(health.readableEnded).toBe(true)
      expect(health.readableLength).toBe(0)
      expect(health.complete).toBe(true)

      // 3) 同一 agent 的合法小请求：连接应可复用
      const followup = await sendChunked(port, [Buffer.from('{"a":1}')], agent)
      expect(followup.status).toBe(200)
      expect(followup.body).toBe('ok:7')
      expect(followup.reused).toBe(true)

      // 4) 全程不得出现未捕获异常（v1 的 cancel 路径会抛 ERR_INVALID_STATE）
      expect(uncaught).toBeNull()
    },
    CASE_TIMEOUT_MS,
  )

  it(
    '慢速超限请求不会永久占住连接：后续合法请求在超时内完成',
    async () => {
      const port = await startServer()
      agent = new http.Agent({ keepAlive: true, maxSockets: 1 })

      // 慢速客户端：每 5ms 发一块，超限后仍继续发送（模拟真实慢速攻击）
      const slow = await new Promise<SendResult>((resolve, reject) => {
        const req = http.request(
          {
            port,
            host: '127.0.0.1',
            path: '/',
            method: 'POST',
            agent: agent!,
            headers: { 'transfer-encoding': 'chunked' },
          },
          res => {
            let body = ''
            res.setEncoding('utf-8')
            res.on('data', d => {
              body += d
            })
            res.on('end', () =>
              resolve({ status: res.statusCode ?? 0, body, reused: req.reusedSocket }),
            )
          },
        )
        req.on('error', reject)
        let sent = 0
        const timer = setInterval(() => {
          if (sent++ >= 60) {
            clearInterval(timer)
            req.end()
            return
          }
          req.write(Buffer.alloc(256, 120))
        }, 5)
      })
      expect(slow.status).toBe(413)

      // 关键：超限响应后连接仍可继续服务——后续合法请求必须在超时内完成。
      // （慢速场景下客户端仍在发送，服务端可能提前 destroy 该连接，
      //   因此这里断言用户可见结果，而不是内部 readableEnded 状态。）
      const followup = await sendChunked(port, [Buffer.from('{"b":2}')], agent)
      expect(followup.status).toBe(200)
      expect(followup.body).toBe('ok:7')
      expect(uncaught).toBeNull()
    },
    CASE_TIMEOUT_MS,
  )

  it(
    '上限内的 chunked 请求正常读取，并复用同一 keep-alive 连接',
    async () => {
      const port = await startServer()
      agent = new http.Agent({ keepAlive: true, maxSockets: 1 })

      const first = await sendChunked(port, [Buffer.from('{"x":1}')], agent)
      expect(first.status).toBe(200)
      expect(first.body).toBe('ok:7')

      const second = await sendChunked(port, [Buffer.from('{"y":22}')], agent)
      expect(second.status).toBe(200)
      expect(second.body).toBe('ok:8')
      expect(second.reused).toBe(true)
      expect(uncaught).toBeNull()
    },
    CASE_TIMEOUT_MS,
  )

  it(
    '已结束且无预缓冲体的真实请求：在有限时间内返回空体语义，不永久 pending',
    async () => {
      // 场景：上游中间件已消费请求体（readableEnded=true），helper 必须识别并
      // 按空体处理，而不是注册监听等一个永不再触发的 end 事件。
      const port = await startFinishedServer()
      agent = new http.Agent({ keepAlive: true, maxSockets: 1 })

      const result = await sendChunked(port, [Buffer.from('{"a":1}')], agent)
      // handler 在请求已结束后调用 helper：应返回 200 且内容为 null（空体）
      expect(result.status).toBe(200)
      expect(result.body).toBe('ok:null')
      expect(uncaught).toBeNull()
    },
    CASE_TIMEOUT_MS,
  )

  it(
    '上游已预缓冲 req.rawBody 的真实请求：取到内容且不永久 pending',
    async () => {
      // 场景：中间件已把请求体读成 Buffer 挂在 req.rawBody 上并消费了 socket。
      // helper 应识别预缓冲来源并返回其内容，而不是等 socket 事件。
      const port = await startPreBufferedServer()
      agent = new http.Agent({ keepAlive: true, maxSockets: 1 })

      const result = await sendChunked(port, [Buffer.from('{"c":3}')], agent)
      expect(result.status).toBe(200)
      expect(result.body).toBe('ok:7')
      expect(uncaught).toBeNull()
    },
    CASE_TIMEOUT_MS,
  )

  it(
    'message 已完整接收但 readable 未结束时：请求体仍被完整读取（不返回假 null）',
    async () => {
      // 场景：客户端已把请求体全部发出（Node 的 complete=true），但服务端还没读过
      // 一个字节——数据停在 readable 缓冲区里。helper 必须继续直读，不能因为
      // message 完整就当作"请求体已结束"而返回 null。
      const port = await startBufferedServer()
      agent = new http.Agent({ keepAlive: true, maxSockets: 1 })

      const result = await sendChunked(port, [Buffer.from('{"d":4}')], agent)
      expect(result.status).toBe(200)
      expect(result.body).toBe('ok:7')
      expect(uncaught).toBeNull()
    },
    CASE_TIMEOUT_MS,
  )

  it(
    'live 请求携带空 _requestBody：不回退 readRawBody，数据仍被读取',
    async () => {
      // 场景：上游设置了空字符串 _requestBody（h3 truthy 链视为"无预缓冲"）。
      // helper 必须继续走 live 直读，不能触发 readRawBody 重新完整读取 socket。
      const port = await startEmptyPreBufferServer()
      agent = new http.Agent({ keepAlive: true, maxSockets: 1 })

      const result = await sendChunked(port, [Buffer.from('{"e":5}')], agent)
      expect(result.status).toBe(200)
      expect(result.body).toBe('ok:7')
      expect(uncaught).toBeNull()
    },
    CASE_TIMEOUT_MS,
  )
})
