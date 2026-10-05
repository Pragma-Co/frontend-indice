import { describe, expect, it } from 'vitest'
import { canCreateRevision, statusBadgeFor } from '../../src/utils/documentStatus'

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

describe('canCreateRevision', () => {
  it('should allow a new revision for a document in force', () => {
    expect(canCreateRevision('APPROVED')).toBe(true)
  })

  it('should block a new revision while another one is under review', () => {
    expect(canCreateRevision('PENDING')).toBe(false)
  })
})
