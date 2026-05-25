declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }
  interface Database {
    run(sql: string, params?: any[]): { lastInsertRowid: number; changes: number }
    exec(sql: string): any[]
    prepare(sql: string): Statement
    getRowsModified(): number
    export(): Uint8Array
    close(): void
  }
  interface Statement {
    bind(params?: any[]): boolean
    step(): boolean
    getAsObject(params?: object): Record<string, any>
    free(): boolean
  }
  export type { SqlJsStatic, Database }
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}
