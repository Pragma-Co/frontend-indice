import { getFileExtension } from './validators'

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

const FILE_TYPE_LABELS_BY_EXTENSION = {
  pdf: 'Memorial',
  doc: 'Documento',
  docx: 'Documento',
  jpeg: 'Imagem',
  jpg: 'Imagem',
  png: 'Imagem',
}

export function getFileTypeLabel(fileName) {
  const extension = getFileExtension(fileName)
  return FILE_TYPE_LABELS_BY_EXTENSION[extension] ?? 'Documento'
}
