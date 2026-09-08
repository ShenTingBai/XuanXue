import { existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { describe, expect, it } from 'vitest'

// 该回归只检查生产运行时定位策略，不读取、创建、迁移或删除真实 xuanxue.db。
describe('sql.js 生产运行时 WASM 定位', () => {
  const root = resolve(process.cwd())

  it('源码包中存在 sql-wasm.wasm（复制来源）', () => {
    expect(existsSync(resolve(root, 'node_modules/sql.js/dist/sql-wasm.wasm'))).toBe(true)
  })

  it('nuxt.config.ts 使用 nitro compiled 钩子把 WASM 复制到服务端输出', () => {
    const configSource = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf-8')
    expect(configSource).toContain('sql-wasm.wasm')
    expect(configSource).toContain('nitro')
    expect(configSource).toContain('compiled')
    expect(configSource).toContain('serverDir')
    // 不得要求把 WASM 发布到 public 目录
    expect(configSource).not.toContain('publicDir')
  })

  it('构建后目标 WASM 与服务端 sql-wasm.js 同目录存在', () => {
    const serverSqlJs = resolve(root, '.output/server/node_modules/sql.js/dist/sql-wasm.js')
    const serverWasm = join(
      resolve(root, '.output/server/node_modules/sql.js/dist'),
      'sql-wasm.wasm',
    )
    // 若生产构建已运行（.output 存在），必须满足 WASM 与 JS 同目录；未构建时不阻塞。
    if (existsSync(serverSqlJs)) {
      expect(existsSync(serverWasm)).toBe(true)
    }
  })

  it('server/database/db.ts 不改变数据库 API 或持久化行为', () => {
    const dbSource = readFileSync(resolve(root, 'server/database/db.ts'), 'utf-8')
    expect(dbSource).toContain('DB_PATH = process.env.DB_PATH')
    expect(dbSource).toContain('initSqlJs')
  })

  it('R2 默认新库为 xuanxue-r2.db', () => {
    const dbSource = readFileSync(resolve(root, 'server/database/db.ts'), 'utf-8')
    expect(dbSource).toContain("path.resolve(process.cwd(), 'xuanxue-r2.db')")
  })

  it('db.ts 不含读取、复制或迁移旧 xuanxue.db 的逻辑', () => {
    const dbSource = readFileSync(resolve(root, 'server/database/db.ts'), 'utf-8')
    // 默认路径必须是新库，不能回退到旧库
    expect(dbSource).not.toContain("path.resolve(process.cwd(), 'xuanxue.db')")
    // 不引用旧表结构或旧迁移
    expect(dbSource).not.toContain('CREATE_PROFILES_TABLE')
    expect(dbSource).not.toContain('CREATE_DIVINATION_TABLE')
  })
})
