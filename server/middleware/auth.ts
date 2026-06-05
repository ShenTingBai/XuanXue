import { getProfileIdFromToken } from '../utils/auth'

export default defineEventHandler(async event => {
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const profileId = token ? getProfileIdFromToken(token) : null
  if (profileId && token) {
    event.context.profileId = profileId
    event.context.token = token
  }
})
