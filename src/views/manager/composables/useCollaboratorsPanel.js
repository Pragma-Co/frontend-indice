import { computed, onMounted, ref } from 'vue'
import {
  addAccessGroupMember,
  fetchAccessGroupMembers,
  fetchAccessGroups,
  removeAccessGroupMember,
} from '@/api/manager.js'
import { useNotificationStore } from '@/stores/notificationStore.js'
import { getInitials } from '@/utils/formatters.js'

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar os colaboradores da área.'
const PERMISSION_ERROR_MESSAGE = 'Você não tem permissão para gerenciar os grupos desta área.'
const MEMBER_ALREADY_ADDED = 'AccessGroupMemberExists'
const MEMBER_ALREADY_REMOVED = 'AccessGroupMemberNotFound'

function compareNames(first, second) {
  return first.name.localeCompare(second.name, 'pt-BR')
}

function foldText(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function normalizeAccessGroup(group) {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? '',
    secrecyLevel: group.secrecy_level,
    active: group.active ?? true,
  }
}

export function mergeCollaborators(known, groups, memberLists) {
  const byId = new Map(known.map((person) => [person.id, { ...person, groupIds: [] }]))
  groups.forEach((group, index) => {
    for (const member of memberLists[index]) {
      const person = byId.get(member.user_id) ?? {
        id: member.user_id,
        name: member.name,
        email: member.email,
        initials: getInitials(member.name),
        groupIds: [],
      }
      person.groupIds.push(group.id)
      byId.set(person.id, person)
    }
  })
  return [...byId.values()].sort(compareNames)
}

function membershipErrorFor(failedGroups, savedSomething) {
  const names = failedGroups.map((group) => group.name).join(', ')
  const saved = savedSomething ? ' As demais alterações foram salvas.' : ''
  return `Não foi possível atualizar: ${names}.${saved}`
}

export function useCollaboratorsPanel() {
  const notifications = useNotificationStore()

  const groups = ref([])
  const collaborators = ref([])
  const loading = ref(true)
  const error = ref('')
  const search = ref('')

  const editingCollaboratorId = ref(null)
  const savingMemberships = ref(false)
  const membershipError = ref('')

  let latestLoad = 0

  const collaboratorRows = computed(() => {
    const groupsById = new Map(groups.value.map((group) => [group.id, group]))
    const term = foldText(search.value.trim())
    return collaborators.value
      .filter((person) => !term || foldText(`${person.name} ${person.email}`).includes(term))
      .map((person) => ({
        ...person,
        groups: person.groupIds
          .map((groupId) => groupsById.get(groupId))
          .filter(Boolean)
          .sort(compareNames),
      }))
  })

  const editingCollaborator = computed(
    () => collaborators.value.find((person) => person.id === editingCollaboratorId.value) ?? null,
  )

  async function load() {
    const request = ++latestLoad
    loading.value = true
    error.value = ''
    try {
      const response = await fetchAccessGroups()
      const loadedGroups = (response?.results ?? []).map(normalizeAccessGroup).sort(compareNames)
      const memberResponses = await Promise.all(
        loadedGroups.map((group) => fetchAccessGroupMembers(group.id)),
      )
      if (request !== latestLoad) return
      groups.value = loadedGroups
      const memberLists = memberResponses.map((members) => members?.results ?? [])
      collaborators.value = mergeCollaborators(collaborators.value, groups.value, memberLists)
    } catch (failure) {
      if (request !== latestLoad) return
      const forbidden = failure?.status === 401 || failure?.status === 403
      error.value = forbidden ? PERMISSION_ERROR_MESSAGE : LOAD_ERROR_MESSAGE
    } finally {
      if (request === latestLoad) loading.value = false
    }
  }

  function openMembershipDialog(collaboratorId) {
    membershipError.value = ''
    editingCollaboratorId.value = collaboratorId
  }

  function closeMembershipDialog() {
    if (savingMemberships.value) return
    editingCollaboratorId.value = null
    membershipError.value = ''
  }

  async function applyMembershipChange(group, { send, alreadyAppliedError, apply }) {
    try {
      await send()
    } catch (failure) {
      if (failure?.details?.error !== alreadyAppliedError) return { group, applied: false }
    }
    apply()
    return { group, applied: true }
  }

  function additionFor(person, group) {
    return applyMembershipChange(group, {
      send: () => addAccessGroupMember(group.id, person.id),
      alreadyAppliedError: MEMBER_ALREADY_ADDED,
      apply: () => {
        person.groupIds = [...person.groupIds, group.id]
      },
    })
  }

  function removalFor(person, group) {
    return applyMembershipChange(group, {
      send: () => removeAccessGroupMember(group.id, person.id),
      alreadyAppliedError: MEMBER_ALREADY_REMOVED,
      apply: () => {
        person.groupIds = person.groupIds.filter((groupId) => groupId !== group.id)
      },
    })
  }

  async function saveMemberships(selectedGroupIds) {
    const person = editingCollaborator.value
    if (!person || savingMemberships.value) return
    const added = groups.value.filter(
      (group) => selectedGroupIds.includes(group.id) && !person.groupIds.includes(group.id),
    )
    const removed = groups.value.filter(
      (group) => person.groupIds.includes(group.id) && !selectedGroupIds.includes(group.id),
    )

    savingMemberships.value = true
    membershipError.value = ''
    const outcomes = await Promise.all([
      ...added.map((group) => additionFor(person, group)),
      ...removed.map((group) => removalFor(person, group)),
    ])
    savingMemberships.value = false

    const failedGroups = outcomes.filter(({ applied }) => !applied).map(({ group }) => group)
    if (failedGroups.length) {
      membershipError.value = membershipErrorFor(
        failedGroups,
        failedGroups.length < outcomes.length,
      )
      return
    }
    closeMembershipDialog()
    notifications.success(`Grupos de acesso de ${person.name} atualizados.`)
  }

  onMounted(load)

  return {
    groups,
    collaboratorRows,
    loading,
    error,
    search,
    load,
    editingCollaborator,
    savingMemberships,
    membershipError,
    openMembershipDialog,
    closeMembershipDialog,
    saveMemberships,
  }
}
