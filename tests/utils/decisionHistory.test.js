import { describe, expect, it } from 'vitest'
import { decisionLabel, requestTypeLabel } from '../../src/utils/decisionHistory'

describe('decisionHistory', () => {
  it('should word a revision decision as approved or rejected', () => {
    expect(decisionLabel('REVISION', 'APPROVED')).toBe('Aprovada')
    expect(decisionLabel('REVISION', 'REJECTED')).toBe('Reprovada')
  })

  it('should word an access decision as granted or denied', () => {
    expect(decisionLabel('ACCESS', 'APPROVED')).toBe('Deferido')
    expect(decisionLabel('ACCESS', 'REJECTED')).toBe('Indeferido')
  })

  it('should name the request types and tolerate unknown values', () => {
    expect(requestTypeLabel('REVISION')).toBe('Revisão técnica')
    expect(requestTypeLabel('ACCESS')).toBe('Acesso restrito')
    expect(requestTypeLabel('OTHER')).toBe('—')
    expect(decisionLabel('OTHER', 'APPROVED')).toBe('—')
  })
})
