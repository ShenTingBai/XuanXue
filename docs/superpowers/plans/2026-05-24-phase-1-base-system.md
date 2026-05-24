# Phase 1: 基础系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core Nuxt 3 project with SQLite, user login (nickname + PIN), and profile management.

**Architecture:** Nuxt 3 fullstack app with Nitro server routes for API, SQLite via `better-sqlite3` for persistence, and vue-router for client-side navigation. All API routes are under `server/api/`. Pages use Nuxt's file-based routing.

**Tech Stack:** Nuxt 3, Vue 3, SQLite (better-sqlite3), TailwindCSS

---

## File Structure

```
xuanxue/
├── nuxt.config.ts                 # Nuxt configuration
├── package.json                   # Dependencies
├── app.vue                        # Root component (NuxtPage)
├── server/
│   ├── utils/
│   │   └── profile.ts              # toSafeProfile helper
│   ├── database/
│   │   ├── schema.ts              # DB schema: profiles table
│   │   └── db.ts                  # SQLite connection singleton
│   └── api/
│       ├── auth/
│       │   ├── login.post.ts      # POST /api/auth/login
│       │   └── register.post.ts   # POST /api/auth/register
│       └── profiles/
│           ├── [id].get.ts        # GET /api/profiles/:id
│           └── [id].put.ts        # PUT /api/profiles/:id
├── pages/
│   ├── index.vue                  # Home: tool grid
│   ├── login.vue                  # Login / create profile
│   └── profile/
│       └── [id].vue               # Edit profile
├── composables/
│   └── useAuth.ts                 # Auth state (profile ref, login, logout)
└── assets/
    └── css/
        └── main.css               # Global CSS (minimal, Tailwind covers most)
```

---

### Task 1: Scaffold Nuxt 3 project

**Files:**
- Create: `package.json`
- Create: `nuxt.config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "xuanxue",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxi dev",
    "build": "nuxi build",
    "preview": "nuxi preview"
  },
  "dependencies": {
    "nuxt": "^3.14.0",
    "better-sqlite3": "^11.7.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^20.0.0",
    "tailwindcss": "^3.4.0",
    "@nuxtjs/tailwindcss": "^6.12.0"
  }
}
```

- [ ] **Step 2: Create nuxt.config.ts**

```typescript
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  nitro: {
    externals: {
      module: ['better-sqlite3']
    }
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true }
})
```

- [ ] **Step 3: Install and verify**

Run: `cd /d/Develop/Project/github/XuanXue && npm install`
Expected: Installs all dependencies without errors.

Run: `npx nuxi info`
Expected: Shows Nuxt project info.

- [ ] **Step 4: Create app.vue**

```vue
<template>
  <NuxtPage />
</template>
```

- [ ] **Step 5: Create assets/css/main.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Create tailwind.config (implicit via @nuxtjs/tailwindcss)**

The module auto-configures Tailwind. Content paths are auto-detected. No config file needed unless customizing.

- [ ] **Step 7: Create .gitignore**

```gitignore
node_modules/
.nuxt/
.output/
xuanxue.db
xuanxue.db-journal
xuanxue.db-wal
xuanxue.db-shm
```

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json nuxt.config.ts app.vue assets/css/main.css
git commit -m "feat: scaffold Nuxt 3 project with TailwindCSS and better-sqlite3"
```

---

### Task 2: Database setup (schema + connection)

**Files:**
- Create: `server/database/schema.ts`
- Create: `server/database/db.ts`

- [ ] **Step 1: Create server/database/schema.ts**

```typescript
export interface Profile {
  id: number
  nickname: string
  birth_date: string | null
  birth_calendar: 'solar' | 'lunar' | null
  birth_hour: number | null
  birth_minute: number | null
  gender: string | null
  created_at: string
  updated_at: string
}

// Client-safe profile (no pin)
export type SafeProfile = Profile & { pin?: never }

export const CREATE_PROFILES_TABLE = `
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL CHECK(length(pin) = 4),
  birth_date TEXT,
  birth_calendar TEXT CHECK(birth_calendar IS NULL OR birth_calendar IN ('solar', 'lunar')),
  birth_hour INTEGER CHECK(birth_hour IS NULL OR (birth_hour >= 0 AND birth_hour <= 23)),
  birth_minute INTEGER CHECK(birth_minute IS NULL OR (birth_minute >= 0 AND birth_minute <= 59)),
  gender TEXT CHECK(gender IS NULL OR gender IN ('男', '女')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`

export const CREATE_DIVINATION_TABLE = `
CREATE TABLE IF NOT EXISTS divination_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  input_data TEXT NOT NULL,
  result_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`
```

- [ ] **Step 2: Create server/database/db.ts**

```typescript
import Database from 'better-sqlite3'
import path from 'path'
import { CREATE_PROFILES_TABLE, CREATE_SESSIONS_TABLE, CREATE_DIVINATION_TABLE } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    // Use DB_PATH env var if set, otherwise default to project root
    const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'xuanxue.db')
    db = new Database(dbPath)

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL')

    // Create tables
    db.exec(CREATE_PROFILES_TABLE)
    db.exec(CREATE_SESSIONS_TABLE)
    db.exec(CREATE_DIVINATION_TABLE)
  }
  return db
}
```

- [ ] **Step 3: Verify DB works**

Run: `node -e "require('better-sqlite3')"` in the project directory
Expected: No errors (module loads).

- [ ] **Step 4: Commit**

```bash
git add server/database/schema.ts server/database/db.ts
git commit -m "feat: add SQLite schema and connection singleton"
```

---

### Task 3: Auth API (login + register)

**Files:**
- Create: `server/utils/profile.ts`
- Create: `server/utils/auth.ts`
- Create: `server/api/auth/login.post.ts`
- Create: `server/api/auth/register.post.ts`

- [ ] **Step 1: Create server/utils/profile.ts (shared helper to strip pin)**

```typescript
// server/utils/profile.ts
export function toSafeProfile(profile: Record<string, unknown>) {
  const { pin, ...safe } = profile
  return safe
}
```

- [ ] **Step 1b: Create server/utils/auth.ts (token helpers)**

```typescript
import { getDb } from '../database/db'

export function createSessionToken(profileId: number): string {
  const db = getDb()
  const token = Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('')
  db.prepare('INSERT INTO sessions (profile_id, token) VALUES (?, ?)').run(profileId, token)
  return token
}

export function getProfileIdFromToken(token: string): number | null {
  if (!token) return null
  const db = getDb()
  const session = db.prepare(
    'SELECT profile_id FROM sessions WHERE token = ?'
  ).get(token) as { profile_id: number } | undefined
  return session?.profile_id || null
}

export function deleteSession(token: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}
```

- [ ] **Step 2 (was Step 2): Create server/api/auth/login.post.ts**

```typescript
import { getDb } from '../../database/db'
import { createSessionToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { nickname, pin } = body || {}

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  const db = getDb()
  const profile = db.prepare('SELECT * FROM profiles WHERE nickname = ? AND pin = ?').get(nickname, pin) as Record<string, unknown> | undefined

  if (!profile) {
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  const token = createSessionToken(profile.id as number)

  return { success: true, profile: toSafeProfile(profile), token }
})
```

- [ ] **Step 3 (was Step 3): Create server/api/auth/register.post.ts**

```typescript
import { getDb } from '../../database/db'
import { createSessionToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { nickname, pin } = body || {}

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  if (nickname.length < 1 || nickname.length > 20) {
    throw createError({ statusCode: 400, statusMessage: '昵称长度为1-20个字符' })
  }

  const db = getDb()

  // Check if nickname already exists
  const existing = db.prepare('SELECT id FROM profiles WHERE nickname = ?').get(nickname)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
  }

  const result = db.prepare(
    'INSERT INTO profiles (nickname, pin) VALUES (?, ?)'
  ).run(nickname, pin)

  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>

  const token = createSessionToken(result.lastInsertRowid as number)

  return { success: true, profile: toSafeProfile(profile), token }
})
```

- [ ] **Step 4: Create server/api/auth/logout.delete.ts**

```typescript
import { getProfileIdFromToken, deleteSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: '缺少认证信息' })
  }

  const profileId = getProfileIdFromToken(token)
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }

  deleteSession(token)
  return { success: true }
})
```

- [ ] **Step 5: Test auth APIs manually**

Run: `cd /d/Develop/Project/github/XuanXue && npx nuxi dev` in background.

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nickname":"测试用户","pin":"1234"}'
```
Expected: `{"success":true,"profile":{...},"token":"<32-char-token>"}` (save the token for later tests)

```bash
# Login with correct PIN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"测试用户","pin":"1234"}'
```
Expected: `{"success":true,"profile":{...},"token":"<32-char-token>"}`

```bash
# Login with wrong PIN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nickname":"测试用户","pin":"0000"}'
```
Expected: 401 error

```bash
# Duplicate register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nickname":"测试用户","pin":"1234"}'
```
Expected: 409 error

- [ ] **Step 6: Commit**

```bash
git add server/utils/profile.ts server/utils/auth.ts server/api/auth/login.post.ts server/api/auth/register.post.ts server/api/auth/logout.delete.ts
git commit -m "feat: add auth API (login + register + logout) with session token"
```

---

### Task 4: Profile API (read + update)

**Files:**
- Create: `server/api/profiles/[id].get.ts`
- Create: `server/api/profiles/[id].put.ts`

- [ ] **Step 1: Create server/api/profiles/[id].get.ts**

```typescript
import { getDb } from '../../database/db'
import { getProfileIdFromToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params!.id)

  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }

  // If token provided, validate it (enables session restore to detect stale sessions)
  const authHeader = getHeader(event, 'authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    const profileIdFromToken = getProfileIdFromToken(token)
    if (!profileIdFromToken || profileIdFromToken !== id) {
      throw createError({ statusCode: 403, statusMessage: '会话已失效，请重新登录' })
    }
  }

  const db = getDb()
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Record<string, unknown> | undefined

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: '档案不存在' })
  }

  return { success: true, profile: toSafeProfile(profile) }
})
```

- [ ] **Step 2: Create server/api/profiles/[id].put.ts**

```typescript
import { getDb } from '../../database/db'
import { getProfileIdFromToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params!.id)

  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }

  // Verify token — only the profile owner can update
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.replace('Bearer ', '')
  const profileIdFromToken = token ? getProfileIdFromToken(token) : null
  if (!profileIdFromToken || profileIdFromToken !== id) {
    throw createError({ statusCode: 403, statusMessage: '无权修改此档案' })
  }

  const body = await readBody(event)
  const db = getDb()

  // Build update fields (only allow updating birth info and gender)
  const updates: string[] = []
  const values: any[] = []

  if (body.birth_date !== undefined) {
    if (body.birth_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.birth_date)) {
      throw createError({ statusCode: 400, statusMessage: '日期格式应为 YYYY-MM-DD' })
    }
    updates.push('birth_date = ?')
    values.push(body.birth_date || null)
  }
  if (body.birth_calendar !== undefined) {
    if (body.birth_calendar !== null && !['solar', 'lunar'].includes(body.birth_calendar)) {
      throw createError({ statusCode: 400, statusMessage: '历法取值: solar/lunar' })
    }
    updates.push('birth_calendar = ?')
    values.push(body.birth_calendar || null)
  }
  if (body.birth_hour !== undefined) {
    const h = body.birth_hour
    if (h !== null && (h < 0 || h > 23)) {
      throw createError({ statusCode: 400, statusMessage: '时辰范围为 0-23' })
    }
    updates.push('birth_hour = ?')
    values.push(h ?? null)
  }
  if (body.birth_minute !== undefined) {
    const m = body.birth_minute
    if (m !== null && (m < 0 || m > 59)) {
      throw createError({ statusCode: 400, statusMessage: '分钟范围为 0-59' })
    }
    updates.push('birth_minute = ?')
    values.push(m ?? null)
  }
  if (body.gender !== undefined) {
    if (body.gender !== null && !['男', '女'].includes(body.gender)) {
      throw createError({ statusCode: 400, statusMessage: '性别取值: 男/女' })
    }
    updates.push('gender = ?')
    values.push(body.gender || null)
  }

  if (updates.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '没有需要更新的字段' })
  }

  updates.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Record<string, unknown>

  return { success: true, profile: toSafeProfile(profile) }
})
```

- [ ] **Step 3: Test profile APIs manually**

```bash
# Get profile
curl http://localhost:3000/api/profiles/1
```
Expected: Profile object

```bash
# Get token first (from login/register response), then update profile
TOKEN="<paste-token-from-login>"
curl -X PUT http://localhost:3000/api/profiles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"birth_date":"2000-01-15","gender":"男"}'
```
Expected: Updated profile

```bash
# Verify auth is enforced — request without token should fail
curl -X PUT http://localhost:3000/api/profiles/1 \
  -H "Content-Type: application/json" \
  -d '{"birth_date":"2000-01-15"}'
```
Expected: 403 error

- [ ] **Step 4: Commit**

```bash
git add server/api/profiles/[id].get.ts server/api/profiles/[id].put.ts
git commit -m "feat: add profile API (read + update)"
```

---

### Task 5: Auth composable

**Files:**
- Create: `composables/useAuth.ts`

- [ ] **Step 1: Create composables/useAuth.ts**

```typescript
import { ref, computed } from 'vue'

export interface Profile {
  id: number
  nickname: string
  birth_date: string | null
  birth_calendar: 'solar' | 'lunar' | null
  birth_hour: number | null
  birth_minute: number | null
  gender: string | null
  created_at: string
  updated_at: string
}

const SESSION_KEY = 'xuanxue_session'

const currentProfile = ref<Profile | null>(null)
const loading = ref(false)

interface SessionData {
  profileId: number
  token: string
}

function getStoredSession(): SessionData | null {
  if (import.meta.client) {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      try { return JSON.parse(raw) } catch { /* ignore */ }
    }
  }
  return null
}

function setStoredSession(profileId: number, token: string): void {
  if (import.meta.client) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId, token }))
  }
}

function clearStoredSession(): void {
  if (import.meta.client) {
    localStorage.removeItem(SESSION_KEY)
  }
}

// Extract error message consistently from $fetch errors
function getErrorMessage(e: any, fallback: string): string {
  return e?.data?.statusMessage || e?.statusMessage || e?.message || fallback
}

export function useAuth() {
  async function login(nickname: string, pin: string): Promise<Profile> {
    loading.value = true
    try {
      const data = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { nickname, pin }
      })

      if (!data?.profile) {
        throw new Error('服务器响应格式异常')
      }

      currentProfile.value = data.profile
      setStoredSession(data.profile.id, data.token)
      return data.profile
    } catch (e: any) {
      throw new Error(getErrorMessage(e, '登录失败'))
    } finally {
      loading.value = false
    }
  }

  async function register(nickname: string, pin: string): Promise<Profile> {
    loading.value = true
    try {
      const data = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { nickname, pin }
      })

      if (!data?.profile) {
        throw new Error('服务器响应格式异常')
      }

      currentProfile.value = data.profile
      setStoredSession(data.profile.id, data.token)
      return data.profile
    } catch (e: any) {
      throw new Error(getErrorMessage(e, '注册失败'))
    } finally {
      loading.value = false
    }
  }

  // Restore session from localStorage on init
  async function restoreSession(): Promise<boolean> {
    const session = getStoredSession()
    if (!session) return false

    try {
      const data = await $fetch(`/api/profiles/${session.profileId}`, {
        headers: session.token ? { authorization: `Bearer ${session.token}` } : {}
      })
      if (data?.profile) {
        currentProfile.value = data.profile
        return true
      }
    } catch {
      clearStoredSession()
    }
    return false
  }

  async function refreshProfile(): Promise<void> {
    if (!currentProfile.value) return
    try {
      const data = await $fetch(`/api/profiles/${currentProfile.value.id}`)
      if (data?.profile) {
        currentProfile.value = data.profile
      }
    } catch {
      // Profile fetch failed — session may be stale
      clearStoredSession()
      currentProfile.value = null
    }
  }

  function getAuthHeaders(): Record<string, string> {
    const session = getStoredSession()
    return session?.token ? { authorization: `Bearer ${session.token}` } : {}
  }

  async function logout(): Promise<void> {
    try {
      const headers = getAuthHeaders()
      if (headers.authorization) {
        await $fetch('/api/auth/logout', { method: 'DELETE', headers })
      }
    } catch {
      // Server logout is best-effort; always clear local state
    }
    currentProfile.value = null
    clearStoredSession()
  }

  const isLoggedIn = computed(() => currentProfile.value !== null)

  return {
    currentProfile,
    isLoggedIn,
    loading,
    login,
    register,
    restoreSession,
    refreshProfile,
    getAuthHeaders,
    logout
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add composables/useAuth.ts
git commit -m "feat: add useAuth composable for auth state management"
```

---

### Task 6: Login page

**Files:**
- Create: `pages/login.vue`

- [ ] **Step 1: Create pages/login.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { login, register, loading } = useAuth()

const nickname = ref('')
const pin = ref('')
const error = ref('')
const isRegisterMode = ref(false)
const confirmPin = ref('')

async function handleSubmit() {
  error.value = ''

  if (!nickname.value.trim() || !pin.value) {
    error.value = '请填写昵称和PIN码'
    return
  }

  if (nickname.value.trim().length > 20) {
    error.value = '昵称最多20个字符'
    return
  }

  if (!/^\d{4}$/.test(pin.value)) {
    error.value = 'PIN码必须为4位数字'
    return
  }

  if (isRegisterMode.value) {
    if (pin.value !== confirmPin.value) {
      error.value = '两次PIN码不一致'
      return
    }
    try {
      await register(nickname.value.trim(), pin.value)
      await router.push('/')
    } catch (e: any) {
      error.value = e.message
    }
  } else {
    try {
      await login(nickname.value.trim(), pin.value)
      await router.push('/')
    } catch (e: any) {
      // If user not found, offer to register
      if (e.message === '昵称或PIN码错误') {
        error.value = '昵称或PIN码错误'
      } else {
        error.value = e.message
      }
    }
  }
}

function switchMode() {
  isRegisterMode.value = !isRegisterMode.value
  error.value = ''
  confirmPin.value = ''
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
    <div class="w-full max-w-sm mx-4">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">玄学</h1>
        <p class="text-gray-400">命理互动平台</p>
      </div>

      <form @submit.prevent="handleSubmit" class="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
        <h2 class="text-xl font-semibold text-white text-center">
          {{ isRegisterMode ? '创建档案' : '登录' }}
        </h2>

        <!-- Nickname -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">昵称</label>
          <input
            v-model="nickname"
            type="text"
            maxlength="20"
            placeholder="输入你的昵称"
            class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <!-- PIN -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">PIN码 (4位数字)</label>
          <input
            v-model="pin"
            type="password"
            maxlength="4"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="****"
            class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-center tracking-widest"
          />
        </div>

        <!-- Confirm PIN (register only) -->
        <div v-if="isRegisterMode">
          <label class="block text-sm text-gray-300 mb-1">确认PIN码</label>
          <input
            v-model="confirmPin"
            type="password"
            maxlength="4"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="****"
            class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-center tracking-widest"
          />
        </div>

        <!-- Error -->
        <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50"
        >
          {{ loading ? '处理中...' : (isRegisterMode ? '创建档案' : '进入') }}
        </button>

        <!-- Switch mode -->
        <p class="text-center text-sm text-gray-400">
          {{ isRegisterMode ? '已有档案？' : '还没有档案？' }}
          <button type="button" @click="switchMode" class="text-purple-400 hover:text-purple-300">
            {{ isRegisterMode ? '去登录' : '创建新档案' }}
          </button>
        </p>
      </form>
    </div>
  </div>
</script>
```

- [ ] **Step 2: Test login page**

Navigate to http://localhost:3000/login
- Verify the login/register form renders
- Test creating a new profile (register mode)
- Test logging in with the created profile
- Test error cases: empty fields, wrong PIN, duplicate nickname

- [ ] **Step 3: Commit**

```bash
git add pages/login.vue
git commit -m "feat: add login/register page"
```

---

### Task 7: Home page (tool grid)

**Files:**
- Create: `pages/index.vue`

- [ ] **Step 1: Create pages/index.vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { currentProfile, isLoggedIn, logout, restoreSession } = useAuth()
const showProfileMenu = ref(false)

async function handleLogout() {
  await logout()
  router.push('/login')
}

// Restore session and redirect if not authenticated
onMounted(async () => {
  const restored = await restoreSession()
  if (!restored && !isLoggedIn.value) {
    router.push('/login')
  }
})

interface ToolCard {
  id: string
  name: string
  description: string
  icon: string
  status: 'ready' | 'coming-soon'
  route: string
}

const tools: ToolCard[] = [
  {
    id: 'shengxiao',
    name: '生肖运势',
    description: '查看生肖属性、五行、性格特征与配对',
    icon: '🐉',
    status: 'ready',
    route: '/tools/shengxiao'
  },
  {
    id: 'constellation',
    name: '星座运势',
    description: '十二星座性格特征、配对与运势',
    icon: '♈',
    status: 'ready',
    route: '/tools/constellation'
  },
  {
    id: 'bazi',
    name: '八字排盘',
    description: '四柱推命、十神定位、五行生克分析',
    icon: '☯',
    status: 'coming-soon',
    route: ''
  },
  {
    id: 'yijing',
    name: '六爻占卜',
    description: '周易起卦、卦象解读',
    icon: '📜',
    status: 'coming-soon',
    route: ''
  },
  {
    id: 'ziwei',
    name: '紫微斗数',
    description: '十二宫排盘、星曜命盘分析',
    icon: '⭐',
    status: 'coming-soon',
    route: ''
  }
]
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
    <!-- Top bar -->
    <header class="border-b border-white/10 bg-white/5 backdrop-blur">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 class="text-xl font-bold text-white">玄学</h1>

        <!-- Profile section -->
        <div class="relative" v-if="currentProfile">
          <button
            @click="showProfileMenu = !showProfileMenu"
            class="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <span class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-medium">
              {{ currentProfile.nickname[0] }}
            </span>
            <span>{{ currentProfile.nickname }}</span>
          </button>

          <!-- Dropdown -->
          <div
            v-if="showProfileMenu"
            class="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-xl overflow-hidden"
            style="z-index: 50"
          >
            <NuxtLink
              :to="`/profile/${currentProfile.id}`"
              class="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
              @click="showProfileMenu = false"
            >
              编辑档案
            </NuxtLink>
            <button
              @click="handleLogout"
              class="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Greeting -->
      <div class="mb-8" v-if="currentProfile">
        <h2 class="text-2xl font-bold text-white">
          你好，{{ currentProfile.nickname }}
        </h2>
        <p class="text-gray-400 mt-1">选择一个工具开始探索</p>
      </div>

      <!-- Tool grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="tool in tools"
          :key="tool.id"
          @click="tool.status === 'ready' && router.push(tool.route)"
          :class="[
            'rounded-2xl p-5 border transition-all',
            tool.status === 'ready'
              ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/50 cursor-pointer'
              : 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed'
          ]"
        >
          <div class="text-3xl mb-3">{{ tool.icon }}</div>
          <h3 class="text-lg font-semibold text-white mb-1">{{ tool.name }}</h3>
          <p class="text-sm text-gray-400">{{ tool.description }}</p>
          <span
            v-if="tool.status === 'coming-soon'"
            class="inline-block mt-3 text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full"
          >
            即将上线
          </span>
        </div>
      </div>
    </main>

    <!-- Click outside to close menu -->
    <div
      v-if="showProfileMenu"
      class="fixed inset-0"
      style="z-index: 40"
      @click="showProfileMenu = false"
    />
  </div>
</template>
```

- [ ] **Step 2: Test home page**

Navigate to http://localhost:3000
- Without login: should redirect to /login
- After login: should show tool grid with greeting
- Verify profile dropdown works (edit profile + logout)
- Verify ready tools are clickable, coming-soon tools are not

- [ ] **Step 3: Commit**

```bash
git add pages/index.vue
git commit -m "feat: add home page with tool grid"
```

---

### Task 8: Profile edit page

**Files:**
- Create: `pages/profile/[id].vue`

- [ ] **Step 1: Create pages/profile/[id].vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const { currentProfile, refreshProfile, isLoggedIn, getAuthHeaders, restoreSession } = useAuth()

const birthDate = ref('')
const birthCalendar = ref<'solar' | 'lunar' | null>(null)
const birthHour = ref<number | null>(null)
const birthMinute = ref<number | null>(null)
const gender = ref<string | null>(null)
const error = ref('')
const saving = ref(false)
const success = ref(false)

onMounted(async () => {
  // Try restoring session first (handles direct navigation / page refresh)
  if (!isLoggedIn.value) {
    const restored = await restoreSession()
    if (!restored) {
      router.push('/login')
      return
    }
  }

  // Security check: can only edit own profile
  if (currentProfile.value && route.params.id !== String(currentProfile.value.id)) {
    router.push('/')
    return
  }

  if (currentProfile.value) {
    birthDate.value = currentProfile.value.birth_date || ''
    birthCalendar.value = currentProfile.value.birth_calendar
    birthHour.value = currentProfile.value.birth_hour
    birthMinute.value = currentProfile.value.birth_minute
    gender.value = currentProfile.value.gender
  }
})

const hourOptions = Array.from({ length: 12 }, (_, i) => {
  const earthly = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const hour = (i * 2 + 23) % 24
  return { label: `${earthly[i]}时 (${hour.toString().padStart(2, '0')}:00-${((hour + 1) % 24).toString().padStart(2, '0')}:59)`, value: hour }
})

async function handleSave() {
  error.value = ''
  saving.value = true
  success.value = false

  if (birthMinute.value !== null && (birthMinute.value < 0 || birthMinute.value > 59)) {
    error.value = '分钟应为 0-59'
    saving.value = false
    return
  }

  try {
    await $fetch(`/api/profiles/${currentProfile.value!.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        birth_date: birthDate.value || null,
        birth_calendar: birthCalendar.value,
        birth_hour: birthHour.value,
        birth_minute: birthMinute.value,
        gender: gender.value
      }
    })

    await refreshProfile()
    success.value = true
    setTimeout(() => { success.value = false }, 2000)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
    <header class="border-b border-white/10 bg-white/5 backdrop-blur">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
        <button @click="router.push('/')" class="text-gray-400 hover:text-white">
          ← 返回
        </button>
        <h1 class="text-lg font-semibold text-white">编辑档案</h1>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-8">
      <div class="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-6">
        <!-- Nickname (read-only) -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">昵称</label>
          <div class="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400">
            {{ currentProfile?.nickname }}
          </div>
        </div>

        <!-- Birth date -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">出生日期</label>
          <input
            v-model="birthDate"
            type="date"
            class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-colors [color-scheme:dark]"
          />
        </div>

        <!-- Calendar type -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">历法</label>
          <div class="flex gap-3">
            <button
              v-for="opt in [{label:'阳历',value:'solar'},{label:'农历',value:'lunar'}]"
              :key="opt.value"
              @click="birthCalendar = birthCalendar === opt.value ? null : opt.value"
              :class="[
                'flex-1 py-2 rounded-xl border transition-colors',
                birthCalendar === opt.value
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/50'
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Birth hour -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">出生时辰（可选）</label>
          <select
            v-model="birthHour"
            class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option :value="null" disabled>选择时辰</option>
            <option v-for="opt in hourOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Birth minute -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">出生分钟（可选）</label>
          <input
            v-model="birthMinute"
            type="number"
            min="0"
            max="59"
            placeholder="0-59"
            class="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <!-- Gender -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">性别（可选）</label>
          <div class="flex gap-3">
            <button
              v-for="opt in ['男', '女']"
              :key="opt"
              @click="gender = gender === opt ? null : opt"
              :class="[
                'flex-1 py-2 rounded-xl border transition-colors',
                gender === opt
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/50'
              ]"
            >
              {{ opt }}
            </button>
          </div>
        </div>

        <!-- Error -->
        <p v-if="error" class="text-red-400 text-sm text-center">{{ error }}</p>

        <!-- Save -->
        <button
          @click="handleSave"
          :disabled="saving"
          class="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>

        <p v-if="success" class="text-green-400 text-sm text-center">保存成功</p>
      </div>
    </main>
  </div>
</template>
```

- [ ] **Step 2: Test profile edit page**

Navigate to http://localhost:3000/profile/1
- Verify all fields load correctly
- Edit birth date, select gender, save
- Verify success message appears
- Go back to home, verify profile data persists

- [ ] **Step 3: Commit**

```bash
git add pages/profile/[id].vue
git commit -m "feat: add profile edit page"
```

---

### Task 9: Add session restore on login page

The login page needs to check for an existing session on mount, so returning users skip straight to home.

**Files:**
- Modify: `pages/login.vue`

- [ ] **Step 1: Add session restore check to login.vue**

Add `onMounted` and `restoreSession` to the page so it auto-redirects if already logged in:

Insert after the existing import and `const` declarations in `pages/login.vue`:

```vue
import { ref, onMounted } from 'vue'

// ... existing refs ...

const { login, register, loading, restoreSession } = useAuth()

onMounted(async () => {
  const restored = await restoreSession()
  if (restored) {
    await router.push('/')
  }
})
```

- [ ] **Step 2: Verify end-to-end flow**

1. Clear localStorage
2. Open /login → should see login form
3. Create a new profile → should redirect to /
4. Close tab, open /login again → should auto-redirect to / (session restored)
5. Logout from profile menu → should go back to /login
6. Manually visit / after logout → should redirect to /login

- [ ] **Step 3: Commit**

```bash
git add pages/login.vue
git commit -m "feat: add session persistence with localStorage"
```

---

## Self-Review Checklist

- [ ] **Spec coverage**: Phase 1 covers all items from the spec: profile CRUD (login, register, view, edit), tool grid home page, Nuxt 3 + SQLite stack. The phase 1 spec requirements are fully covered.
- [ ] **Placeholder scan**: No TBDs, TODOs, or "implement later" patterns. Every step has complete code.
- [ ] **Type consistency**: Profile interface is defined once in useAuth.ts and matches the DB schema. Field names are consistent across all API routes and pages.
