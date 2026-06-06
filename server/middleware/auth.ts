import { getCookie } from 'h3'
import { getProfileIdFromToken } from '../utils/auth'

export default defineEventHandler(async event => {
  const authHeader = getHeader(event, 'authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  // Fallback to httpOnly cookie (gradual migration)
  if (!token) {
    token = getCookie(event, 'xuanxue_token') || null
  }
  const profileId = token ? getProfileIdFromToken(token) : null
  if (profileId && token) {
    event.context.profileId = profileId
    event.context.token = token
  }
})
