import { initDb } from '../database/db'

export default defineNitroPlugin(async () => {
  await initDb()
})
