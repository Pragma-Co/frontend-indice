export const CONFIDENTIALITY_LEVELS = [
  { value: 'PUBLIC', label: 'Público' },
  { value: 'CONFIDENTIAL', label: 'Confidencial' },
  { value: 'SECRET', label: 'Sigiloso' },
]

export const DEFAULT_CONFIDENTIALITY = 'CONFIDENTIAL'

export function findConfidentiality(value) {
  return CONFIDENTIALITY_LEVELS.find((c) => c.value === value) ?? null
}
