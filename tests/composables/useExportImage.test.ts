// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Vue globals (auto-imported by Nuxt, not available in vitest)
vi.stubGlobal('ref', ref)

// Mock html-to-image BEFORE importing the composable
vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
  toJpeg: vi.fn(),
  toSvg: vi.fn(),
  getFontEmbedCSS: vi.fn(),
}))

describe('useExportImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with isExporting=false and exportError=null', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { isExporting, exportError } = useExportImage()
    expect(isExporting.value).toBe(false)
    expect(exportError.value).toBeNull()
  })

  it('sets isExporting=true during export and false after success', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage, isExporting } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('@font-face { src: url(test.woff2); }')
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,fake')

    const promise = exportToImage(mockEl, 'test.png')
    expect(isExporting.value).toBe(true)
    const result = await promise
    expect(result).toBe(true)
    expect(isExporting.value).toBe(false)
  })

  it('returns a data URL from toPng with correct options', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('@font-face { src: url(test.woff2); }')
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,fake-data')

    const result = await exportToImage(mockEl, 'output.png')
    expect(result).toBe(true)
    expect(toPng).toHaveBeenCalledWith(
      mockEl,
      expect.objectContaining({
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#F5F0E8',
      }),
    )
  })

  it('passes fontEmbedCSS to toPng when available', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    const fontCss = '@font-face { src: url(test.woff2); }'
    vi.mocked(getFontEmbedCSS).mockResolvedValue(fontCss)
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,fake')

    await exportToImage(mockEl, 'output.png')
    expect(toPng).toHaveBeenCalledWith(
      mockEl,
      expect.objectContaining({
        fontEmbedCSS: fontCss,
      }),
    )
  })

  it('does not pass fontEmbedCSS when getFontEmbedCSS returns empty', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('')
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,fake')

    await exportToImage(mockEl, 'output.png')
    const callArg = vi.mocked(toPng).mock.calls[0][1]
    expect(callArg).not.toHaveProperty('fontEmbedCSS')
  })

  it('handles getFontEmbedCSS rejection gracefully', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockRejectedValue(new Error('Font loading failed'))
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,fake')

    const result = await exportToImage(mockEl, 'test.png')
    expect(result).toBe(true)
    const callArg = vi.mocked(toPng).mock.calls[0][1]
    expect(callArg).not.toHaveProperty('fontEmbedCSS')
  })

  it('creates a download link and triggers click on success', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage } = useExportImage()
    const mockEl = document.createElement('div')

    const clickSpy = vi.fn()
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return { download: '', href: '', click: clickSpy } as unknown as HTMLAnchorElement
        }
        return document.createElement(tagName)
      })

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('')
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,fake')

    const result = await exportToImage(mockEl, 'test.png')
    expect(result).toBe(true)
    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(clickSpy).toHaveBeenCalled()
    createElementSpy.mockRestore()
  })

  it('sets exportError when toPng fails', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage, isExporting, exportError } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('')
    vi.mocked(toPng).mockRejectedValue(new Error('Canvas export failed'))

    const result = await exportToImage(mockEl, 'test.png')
    expect(result).toBe(false)
    expect(exportError.value).toBe('Canvas export failed')
    expect(isExporting.value).toBe(false)
  })

  it('sets generic error message when non-Error is thrown', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage, exportError } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('')
    vi.mocked(toPng).mockRejectedValue('string error')

    const result = await exportToImage(mockEl, 'test.png')
    expect(result).toBe(false)
    expect(exportError.value).toBe('\u5bfc\u51fa\u5931\u8d25')
  })

  it('returns false without exporting when already exporting', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('')
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,fake')

    const firstPromise = exportToImage(mockEl, 'first.png')
    const result = await exportToImage(mockEl, 'second.png')
    expect(result).toBe(false)
    await firstPromise
  })

  it('restores isExporting to false even when toPng throws', async () => {
    const { useExportImage } = await import('../../composables/useExportImage')
    const { exportToImage, isExporting } = useExportImage()
    const mockEl = document.createElement('div')

    const { toPng, getFontEmbedCSS } = await import('html-to-image')
    vi.mocked(getFontEmbedCSS).mockResolvedValue('')
    vi.mocked(toPng).mockRejectedValue(new Error('fail'))

    await exportToImage(mockEl, 'test.png')
    expect(isExporting.value).toBe(false)
  })
})
