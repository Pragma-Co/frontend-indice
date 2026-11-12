import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client.js'

vi.mock('@/api/manager.js', () => ({
  fetchAccessGroups: vi.fn(),
  fetchAccessGroupMembers: vi.fn(),
  addAccessGroupMember: vi.fn(),
  removeAccessGroupMember: vi.fn(),
}))

import {
  addAccessGroupMember,
  fetchAccessGroupMembers,
  fetchAccessGroups,
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

function respondWith(membersByGroup, groups = [STRUCTURES, LOADS]) {
  fetchAccessGroups.mockResolvedValue({ results: groups })
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
    const result = mergeCollaborators([], [{ id: 1 }, { id: 2 }], [[RAFAEL, MARINA], [MARINA]])

    expect(result.map((person) => [person.name, person.groupIds])).toEqual([
      ['Marina Duarte', [1, 2]],
      ['Rafael Nunes', [1]],
    ])
    expect(result[0].initials).toBe('MD')
  })

  it('should keep a known person who no longer belongs to any group', () => {
    const known = [{ id: 7, name: 'Marina Duarte', email: 'm@x', initials: 'MD', groupIds: [1] }]

    expect(mergeCollaborators(known, [{ id: 1 }], [[]])[0].groupIds).toEqual([])
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
})
