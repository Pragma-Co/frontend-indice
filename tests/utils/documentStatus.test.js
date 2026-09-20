import { describe, expect, it } from 'vitest'
import { statusBadgeFor } from '../../src/utils/documentStatus'

describe('statusBadgeFor', () => {
  it('should show a pending revision as under review', () => {
    expect(statusBadgeFor('PENDING')).toBe('em_revisao')
  })

  it('should map the other revision statuses of the backend', () => {
    expect(statusBadgeFor('APPROVED')).toBe('vigente')
    expect(statusBadgeFor('REJECTED')).toBe('rejeitado')
    expect(statusBadgeFor('OBSOLETE')).toBe('obsoleto')
  })

  it('should return null for a missing or unknown status', () => {
    expect(statusBadgeFor(undefined)).toBeNull()
    expect(statusBadgeFor('SOMETHING_ELSE')).toBeNull()
  })
})
