import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addAccessGroupMember,
  createAccessGroup,
  fetchAccessGroupMembers,
  fetchAccessGroups,
  fetchPendingAccessRequests,
  fetchPendingRevisions,
  removeAccessGroupMember,
  submitRevisionDecision,
} from '../../src/api/manager'

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

describe('manager api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should request the first page of pending revisions by default', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    const page = await fetchPendingRevisions()

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/manager/pending-revisions?page=1')
    expect(page).toEqual({ count: 0, results: [] })
  })

  it('should send the requested page and page size of pending revisions', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    await fetchPendingRevisions({ page: 3, pageSize: 20 })

    expect(globalThis.fetch.mock.calls[0][0]).toBe(
      '/api/manager/pending-revisions?page=3&page_size=20',
    )
  })

  it('should request the pending access requests', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { count: 0, results: [] }))

    await fetchPendingAccessRequests({ page: 2, pageSize: 20 })

    expect(globalThis.fetch.mock.calls[0][0]).toBe(
      '/api/manager/pending-access-requests?page=2&page_size=20',
    )
  })

  it('should reject with the status when the user is not allowed', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(403, { error: 'PermissionDenied' }))

    await expect(fetchPendingRevisions()).rejects.toMatchObject({ status: 403 })
  })

  it('should send the decision and the opinion of the reviewer', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { id: 91, status: 'REJECTED' }))

    const result = await submitRevisionDecision(91, {
      decision: 'REJECTED',
      justification: 'Furação diverge do ensaio aprovado.',
    })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/manager/revisions/91/decision')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      decision: 'REJECTED',
      justification: 'Furação diverge do ensaio aprovado.',
    })
    expect(result).toEqual({ id: 91, status: 'REJECTED' })
  })

  it('should send an empty opinion when approving without comments', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { id: 91, status: 'APPROVED' }))

    await submitRevisionDecision(91, { decision: 'APPROVED' })

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      decision: 'APPROVED',
      justification: '',
    })
  })

  it('should expose the backend error of a refused decision', async () => {
    globalThis.fetch.mockResolvedValue(
      jsonResponse(409, { error: 'RevisionAlreadyDecided', status: 'APPROVED' }),
    )

    await expect(submitRevisionDecision(91, { decision: 'APPROVED' })).rejects.toMatchObject({
      status: 409,
      details: { error: 'RevisionAlreadyDecided' },
    })
  })

  it('should list the access groups of the area', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { results: [] }))

    await fetchAccessGroups()

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/manager/access-groups')
  })

  it('should create an access group translating the secrecy level field', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(201, { id: 4 }))

    const created = await createAccessGroup({
      name: 'Estruturas',
      description: 'Documentação técnica',
      secrecyLevel: 'SECRET',
    })

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/manager/access-groups')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      name: 'Estruturas',
      description: 'Documentação técnica',
      secrecy_level: 'SECRET',
    })
    expect(created).toEqual({ id: 4 })
  })

  it('should list the members of an access group', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(200, { results: [] }))

    await fetchAccessGroupMembers(4)

    expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/manager/access-groups/4/users')
  })

  it('should add a user to an access group', async () => {
    globalThis.fetch.mockResolvedValue(jsonResponse(201, { user_id: 9 }))

    await addAccessGroupMember(4, 9)

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/manager/access-groups/4/users')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ user_id: 9 })
  })

  it('should remove a user from an access group', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' })

    await removeAccessGroupMember(4, 9)

    const [url, init] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('/api/manager/access-groups/4/users/9')
    expect(init.method).toBe('DELETE')
  })
})
