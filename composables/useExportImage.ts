export function useExportImage() {
  const isExporting = ref(false)
  const exportError = ref<string | null>(null)

  let cachedFontCSS: string | null = null

  // ── DOM patch helpers ──

  interface StylePatch {
    el: HTMLElement
    key: string
    original: string
  }

  function setStyle(el: HTMLElement, key: string, value: string): StylePatch {
    const original = el.style.getPropertyValue(key) || ''
    el.style.setProperty(key, value, 'important')
    return { el, key, original }
  }

  function restorePatches(patches: StylePatch[]) {
    for (const p of patches) {
      p.el.style.setProperty(p.key, p.original || '', p.original ? '' : 'important')
    }
  }

  // ── Preprocess: lock compact text & fix border box-model ──

  function lockCompactText(target: HTMLElement): StylePatch[] {
    const patches: StylePatch[] = []
    const all = target.querySelectorAll<HTMLElement>('*')
    all.forEach(el => {
      const style = getComputedStyle(el)
      const disp = style.display

      if (
        el.tagName === 'BUTTON' ||
        disp === 'inline-flex' ||
        disp === 'inline-block' ||
        el.classList.contains('font-display') ||
        el.classList.contains('whitespace-nowrap')
      ) {
        patches.push(setStyle(el, 'white-space', 'nowrap'))
      }

      const bw = style.borderWidth
      const br = style.borderRadius
      if (bw && bw !== '0px' && br && br !== '0px') {
        patches.push(setStyle(el, 'box-sizing', 'border-box'))
      }
    })
    return patches
  }

  // ── Preprocess: replace backdrop-filter with solid background ──

  function patchBackdropFilters(target: HTMLElement): StylePatch[] {
    const patches: StylePatch[] = []
    const all = target.querySelectorAll<HTMLElement>('*')
    all.forEach(el => {
      const style = getComputedStyle(el)
      const backdrop = style.getPropertyValue('backdrop-filter')
      const webkitBackdrop = style.getPropertyValue('-webkit-backdrop-filter')
      if ((backdrop && backdrop !== 'none') || (webkitBackdrop && webkitBackdrop !== 'none')) {
        patches.push(setStyle(el, 'backdrop-filter', 'none'))
        patches.push(setStyle(el, '-webkit-backdrop-filter', 'none'))
        const bg = el.style.backgroundColor
        if (!bg || bg === 'transparent') {
          patches.push(setStyle(el, 'background-color', 'rgba(251, 248, 244, 0.97)'))
        }
      }
    })
    return patches
  }

  // ── Export ──

  async function exportToImage(el: HTMLElement, filename: string): Promise<boolean> {
    if (isExporting.value) return false
    isExporting.value = true
    exportError.value = null

    const textPatches = lockCompactText(el)
    const backdropPatches = patchBackdropFilters(el)
    const allPatches = [...textPatches, ...backdropPatches]

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }

      const [{ toPng, getFontEmbedCSS }] = await Promise.all([import('html-to-image')])

      if (!cachedFontCSS) {
        try {
          cachedFontCSS = await getFontEmbedCSS(el, { preferredFontFormat: 'woff2' })
        } catch {
          cachedFontCSS = ''
        }
      }

      const dataUrl = await toPng(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#F5F0E8',
        preferredFontFormat: 'woff2',
        width: el.offsetWidth,
        height: el.offsetHeight,
        skipAutoScale: true,
        ...(cachedFontCSS ? { fontEmbedCSS: cachedFontCSS } : {}),
      })

      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()

      return true
    } catch (e) {
      exportError.value = e instanceof Error ? e.message : '导出失败'
      console.warn('[useExportImage] Export failed:', exportError.value)
      return false
    } finally {
      restorePatches(allPatches)
      isExporting.value = false
    }
  }

  return { exportToImage, isExporting, exportError }
}
