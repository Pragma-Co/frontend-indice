import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client.js'

vi.mock('@/api/manager.js', () => ({
  fetchAccessGroups: vi.fn(),
  fetchAreaCollaborators: vi.fn(),
  fetchAccessGroupMembers: vi.fn(),
  addAccessGroupMember: vi.fn(),
  removeAccessGroupMember: vi.fn(),
}))

import {
  addAccessGroupMember,
  fetchAccessGroupMembers,
  fetchAccessGroups,
  fetchAreaCollaborators,
  removeAccessGroupMember,
} from '@/api/manager.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import {
  mergeCollaborators,
  normalizeAccessGroup,
  useCollaboratorsPanel,
} from '@/views/manager/composables/useCollaboratorsPanel.js'

const STRUCTURES = {
  id: 1,
  name: 'Estruturas',
  description: 'Documentação técnica',
  secrecy_level: 'PUBLIC',
  active: true,
}
const LOADS = {
  id: 2,
  name: 'Análise de Cargas',
  description: '',
  secrecy_level: 'SECRET',
  active: true,
}
const MARINA = { user_id: 7, name: 'Marina Duarte', email: 'marina.duarte@empresa.com' }
const RAFAEL = { user_id: 8, name: 'Rafael Nunes', email: 'rafael.nunes@empresa.com' }
const JULIA = { id: 9, name: 'Júlia Prado', email: 'julia.prado@empresa.com' }

function asAreaUser({ user_id, name, email }) {
  return { id: user_id, name, email }
}

function respondWith(
  membersByGroup,
  groups = [STRUCTURES, LOADS],
  areaUsers = [MARINA, RAFAEL].map(asAreaUser),
) {
  fetchAccessGroups.mockResolvedValue({ results: groups })
  fetchAreaCollaborators.mockResolvedValue({ results: areaUsers })
  fetchAccessGroupMembers.mockImplementation(async (groupId) => ({
    results: membersByGroup[groupId] ?? [],
  }))
}

async function mountPanel() {
  let panel
  const Harness = defineComponent({
    setup() {
      panel = useCollaboratorsPanel()
      return () => h('div')
    },
  })
  mount(Harness)
  await flushPromises()
  return panel
}

describe('normalizeAccessGroup', () => {
  it('should expose the API group with frontend field names', () => {
    expect(normalizeAccessGroup(STRUCTURES)).toEqual({
      id: 1,
      name: 'Estruturas',
      description: 'Documentação técnica',
      secrecyLevel: 'PUBLIC',
      active: true,
    })
  })
})

describe('mergeCollaborators', () => {
  it('should join the memberships of each person and sort by name', () => {
    const areaUsers = [RAFAEL, MARINA].map(asAreaUser)

    const result = mergeCollaborators(
      areaUsers,
      [{ id: 1 }, { id: 2 }],
      [[RAFAEL, MARINA], [MARINA]],
    )

    expect(result.map((person) => [person.name, person.groupIds])).toEqual([
      ['Marina Duarte', [1, 2]],
      ['Rafael Nunes', [1]],
    ])
    expect(result[0].initials).toBe('MD')
  })

  it('should list a person of the area who belongs to no group', () => {
    const result = mergeCollaborators([JULIA], [{ id: 1 }], [[MARINA]])

    expect(result.map((person) => [person.name, person.groupIds])).toEqual([
      ['Júlia Prado', []],
      ['Marina Duarte', [1]],
    ])
    expect(result[0].initials).toBe('JP')
  })
})

describe('useCollaboratorsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    respondWith({ 1: [MARINA, RAFAEL], 2: [MARINA] })
  })

  it('should load the groups and build one row per collaborator', async () => {
    const panel = await mountPanel()

    expect(panel.loading.value).toBe(false)
    expect(panel.groups.value.map((group) => group.name)).toEqual([
      'Análise de Cargas',
      'Estruturas',
    ])
    expect(
      panel.collaboratorRows.value.map((row) => [row.name, row.groups.map((g) => g.name)]),
    ).toEqual([
      ['Marina Duarte', ['Análise de Cargas', 'Estruturas']],
      ['Rafael Nunes', ['Estruturas']],
    ])
  })

  it('should show a permission message when the API refuses the access', async () => {
    fetchAccessGroups.mockRejectedValue(new ApiError('negado', { status: 403 }))

    const panel = await mountPanel()

    expect(panel.error.value).toBe('Você não tem permissão para gerenciar os grupos desta área.')
    expect(panel.loading.value).toBe(false)
  })

  it('should fail the whole load when the members of one group cannot be read', async () => {
    fetchAccessGroupMembers.mockRejectedValueOnce(new ApiError('falha', { status: 500 }))

    const panel = await mountPanel()

    expect(panel.error.value).toBe('Não foi possível carregar os colaboradores da área.')
    expect(panel.collaboratorRows.value).toEqual([])
  })

  it('should recover after retrying a failed load', async () => {
    fetchAccessGroups.mockRejectedValueOnce(new ApiError('falha', { status: 500 }))
    const panel = await mountPanel()

    await panel.load()

    expect(panel.error.value).toBe('')
    expect(panel.collaboratorRows.value).toHaveLength(2)
  })

  it('should filter by name or e-mail ignoring case and accents', async () => {
    const panel = await mountPanel()

    panel.search.value = 'MÁRINA'
    expect(panel.collaboratorRows.value.map((row) => row.id)).toEqual([7])

    panel.search.value = 'rafael.nunes@'
    expect(panel.collaboratorRows.value.map((row) => row.id)).toEqual([8])

    panel.search.value = 'ninguém'
    expect(panel.collaboratorRows.value).toEqual([])
  })

  it('should send only the differences and update the row without reloading', async () => {
    addAccessGroupMember.mockResolvedValue(RAFAEL)
    removeAccessGroupMember.mockResolvedValue(null)
    const panel = await mountPanel()
    fetchAccessGroups.mockClear()
    panel.openMembershipDialog(8)

    await panel.saveMemberships([2])

    expect(addAccessGroupMember.mock.calls).toEqual([[2, 8]])
    expect(removeAccessGroupMember.mock.calls).toEqual([[1, 8]])
    expect(fetchAccessGroups).not.toHaveBeenCalled()
    expect(panel.collaboratorRows.value[1].groupIds).toEqual([2])
    expect(panel.editingCollaborator.value).toBeNull()
    expect(useNotificationStore().items[0]).toMatchObject({
      type: 'success',
      message: 'Grupos de acesso de Rafael Nunes atualizados.',
    })
  })

  it('should treat a membership already applied elsewhere as saved', async () => {
    addAccessGroupMember.mockRejectedValue(
      new ApiError('conflito', { status: 409, details: { error: 'AccessGroupMemberExists' } }),
    )
    removeAccessGroupMember.mockRejectedValue(
      new ApiError('ausente', { status: 404, details: { error: 'AccessGroupMemberNotFound' } }),
    )
    const panel = await mountPanel()
    panel.openMembershipDialog(8)

    await panel.saveMemberships([2])

    expect(panel.membershipError.value).toBe('')
    expect(panel.collaboratorRows.value[1].groupIds).toEqual([2])
  })

  it('should keep what succeeded and report only the groups that failed', async () => {
    addAccessGroupMember.mockRejectedValue(
      new ApiError('inativo', { status: 409, details: { error: 'AccessGroupInactive' } }),
    )
    removeAccessGroupMember.mockResolvedValue(null)
    const panel = await mountPanel()
    panel.openMembershipDialog(8)

    await panel.saveMemberships([2])

    expect(panel.collaboratorRows.value[1].groupIds).toEqual([])
    expect(panel.editingCollaborator.value?.id).toBe(8)
    expect(panel.membershipError.value).toBe(
      'Não foi possível atualizar: Análise de Cargas. As demais alterações foram salvas.',
    )
    expect(useNotificationStore().items).toEqual([])
  })

  it('should keep showing a collaborator whose last group was removed', async () => {
    removeAccessGroupMember.mockResolvedValue(null)
    const panel = await mountPanel()
    panel.openMembershipDialog(8)

    await panel.saveMemberships([])

    expect(panel.collaboratorRows.value.find((row) => row.id === 8).groups).toEqual([])
  })

  it('should add a collaborator of the area who had no group yet', async () => {
    respondWith(
      { 1: [MARINA] },
      [STRUCTURES, LOADS],
      [MARINA, RAFAEL].map(asAreaUser).concat(JULIA),
    )
    addAccessGroupMember.mockResolvedValue({ user_id: 9, name: JULIA.name, email: JULIA.email })
    const panel = await mountPanel()
    panel.openMembershipDialog(9)

    await panel.saveMemberships([1])

    expect(addAccessGroupMember.mock.calls).toEqual([[1, 9]])
    expect(panel.collaboratorRows.value.find((row) => row.id === 9).groupIds).toEqual([1])
  })

  it('should keep a collaborator without groups after reloading', async () => {
    respondWith({}, [STRUCTURES], [asAreaUser(RAFAEL)])
    const panel = await mountPanel()

    await panel.load()

    expect(panel.collaboratorRows.value.map((row) => [row.id, row.groupIds])).toEqual([[8, []]])
  })

  it('should fail the load when the collaborators of the area cannot be read', async () => {
    fetchAreaCollaborators.mockRejectedValue(new ApiError('negado', { status: 403 }))

    const panel = await mountPanel()

    expect(panel.error.value).toBe('Você não tem permissão para gerenciar os grupos desta área.')
    expect(panel.collaboratorRows.value).toEqual([])
  })
})
