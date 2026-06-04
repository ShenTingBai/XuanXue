export function useExportImage() {
  const isExporting = ref(false)
  const exportError = ref<string | null>(null)

  async function exportToImage(el: HTMLElement, filename: string): Promise<boolean> {
    if (isExporting.value) return false
    isExporting.value = true
    exportError.value = null

    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#F5F0E8',
      })

      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()

      return true
    } catch (e) {
      exportError.value = e instanceof Error ? e.message : '导出失败'
      return false
    } finally {
      isExporting.value = false
    }
  }

  return { exportToImage, isExporting, exportError }
}
