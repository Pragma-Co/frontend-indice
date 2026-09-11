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
  jpeg: 'Imagem',
  png: 'Imagem',
}

export function getFileTypeLabel(fileName) {
  const extension = getFileExtension(fileName)
  return FILE_TYPE_LABELS_BY_EXTENSION[extension] ?? 'Documento'
}

<<<<<<< HEAD
<<<<<<< HEAD
/** "Ana Beatriz Costa" -> "AB"; empty or blank names yield "". */
export function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
=======
export function formatUpdatedAt(isoDate) {
  const date = new Date(isoDate)
  const datePart = date.toLocaleDateString('pt-BR')
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${timePart}`
>>>>>>> 593079a (feat(#32): create documents management interface with pagination and status badges)
=======
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('pt-BR')
}

export function formatUpdatedAt(isoDate) {
  const timePart = new Date(isoDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${formatDate(isoDate)} ${timePart}`
>>>>>>> 6b877d3 (feat(#32): implement Badge component and integrate it into DocumentsTable; enhance PageLayout with actions slot)
}
