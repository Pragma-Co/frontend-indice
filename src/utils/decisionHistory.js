export const HISTORY_REQUEST_TYPES = { REVISION: 'REVISION', ACCESS: 'ACCESS' }
export const HISTORY_DECISIONS = { APPROVED: 'APPROVED', REJECTED: 'REJECTED' }

export const REQUEST_TYPE_LABELS = {
  [HISTORY_REQUEST_TYPES.REVISION]: 'Revisão técnica',
  [HISTORY_REQUEST_TYPES.ACCESS]: 'Acesso restrito',
}

const DECISION_LABELS = {
  [HISTORY_REQUEST_TYPES.REVISION]: {
    [HISTORY_DECISIONS.APPROVED]: 'Aprovada',
    [HISTORY_DECISIONS.REJECTED]: 'Reprovada',
  },
  [HISTORY_REQUEST_TYPES.ACCESS]: {
    [HISTORY_DECISIONS.APPROVED]: 'Deferido',
    [HISTORY_DECISIONS.REJECTED]: 'Indeferido',
  },
}

export function requestTypeLabel(requestType) {
  return REQUEST_TYPE_LABELS[requestType] ?? '—'
}

export function decisionLabel(requestType, decision) {
  return DECISION_LABELS[requestType]?.[decision] ?? '—'
}
