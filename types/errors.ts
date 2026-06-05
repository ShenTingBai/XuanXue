export interface FetchError {
  statusCode?: number
  data?: {
    statusMessage?: string
  }
  message?: string
}
