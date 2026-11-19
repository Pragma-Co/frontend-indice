import { describe, expect, it } from 'vitest'
import {
  REVISION_BLOCK_REASONS,
  canCreateRevision,
  hasDocumentAccess,
  listedRevisionBlockReason,
  revisionBlockReason,
  statusBadgeFor,
} from '../../src/utils/documentStatus'

describe('statusBadgeFor', () => {
  it('should show a pending revision as under review', () => {
    expect(statusBadgeFor('PENDING')).toBe('em_revisao')
  })

  it('should map the other revision statuses of the backend', () => {
    expect(statusBadgeFor('APPROVED')).toBe('vigente')
    expect(statusBadgeFor('REJECTED')).toBe('rejeitado')
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

describe('hasDocumentAccess', () => {
  const RESPONSIBLE_ID = 12

  it('should grant access when the backend approved it', () => {
    const document = { access_status: 'APPROVED', responsible: { id: RESPONSIBLE_ID } }

    expect(hasDocumentAccess(document, 99)).toBe(true)
  })

  it('should grant access to the responsible of the document', () => {
    const document = { access_status: 'PENDING', responsible: { id: RESPONSIBLE_ID } }

    expect(hasDocumentAccess(document, RESPONSIBLE_ID)).toBe(true)
  })

  it('should deny access to anyone else, to an anonymous user and to a missing document', () => {
    const document = { access_status: 'IN_REVIEW', responsible: { id: RESPONSIBLE_ID } }

    expect(hasDocumentAccess(document, 99)).toBe(false)
    expect(hasDocumentAccess(document, null)).toBe(false)
    expect(hasDocumentAccess(null, RESPONSIBLE_ID)).toBe(false)
  })
})

describe('revisionBlockReason', () => {
  const approved = {
    access_status: 'APPROVED',
    responsible: { id: 12 },
    revision: { status: 'APPROVED' },
    areas: [
      { acronym: 'EST', name: 'Engenharia Estrutural' },
      { acronym: 'MFG', name: 'Manufatura e Montagem' },
    ],
  }

  it('should allow a new revision when the user has access and nothing is under review', () => {
    expect(revisionBlockReason(approved, 99, 'MFG')).toBeNull()
  })

  it('should block a user who belongs to none of the areas of the document', () => {
    expect(revisionBlockReason(approved, 12, 'CER')).toBe(REVISION_BLOCK_REASONS.OUTSIDE_AREA)
  })

  it('should block a user without an area', () => {
    expect(revisionBlockReason(approved, 12, '')).toBe(REVISION_BLOCK_REASONS.OUTSIDE_AREA)
  })

  it('should block everyone when the document has no area', () => {
    expect(revisionBlockReason({ ...approved, areas: [] }, 12, 'EST')).toBe(
      REVISION_BLOCK_REASONS.OUTSIDE_AREA,
    )
  })

  it('should report the area before the revision under review', () => {
    const document = { ...approved, revision: { status: 'PENDING' } }

    expect(revisionBlockReason(document, 12, 'CER')).toBe(REVISION_BLOCK_REASONS.OUTSIDE_AREA)
  })

  it('should block a user without access to the document', () => {
    const document = { ...approved, access_status: 'PENDING' }

    expect(revisionBlockReason(document, 99)).toBe(REVISION_BLOCK_REASONS.NO_ACCESS)
  })

  it('should block while another revision is under review', () => {
    const document = { ...approved, revision: { status: 'PENDING' } }

    expect(revisionBlockReason(document, 12, 'EST')).toBe(REVISION_BLOCK_REASONS.IN_PROGRESS)
  })

  it('should report the missing access before the revision under review', () => {
    const document = { ...approved, access_status: 'IN_REVIEW', revision: { status: 'PENDING' } }

    expect(revisionBlockReason(document, 99)).toBe(REVISION_BLOCK_REASONS.NO_ACCESS)
  })
})

describe('listedRevisionBlockReason', () => {
  const listed = { status: 'APPROVED', areas: [{ acronym: 'EST', name: 'Engenharia Estrutural' }] }

  it('should allow a listed document of the user area that is not under review', () => {
    expect(listedRevisionBlockReason(listed, 'EST')).toBeNull()
  })

  it('should block a listed document of another area', () => {
    expect(listedRevisionBlockReason(listed, 'QUA')).toBe(REVISION_BLOCK_REASONS.OUTSIDE_AREA)
  })

  it('should block a listed document under review', () => {
    expect(listedRevisionBlockReason({ ...listed, status: 'PENDING' }, 'EST')).toBe(
      REVISION_BLOCK_REASONS.IN_PROGRESS,
    )
  })
})
