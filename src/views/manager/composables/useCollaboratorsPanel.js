import { computed, onMounted, ref } from 'vue'
import {
  addAccessGroupMember,
  fetchAccessGroupMembers,
  fetchAccessGroups,
  fetchAreaCollaborators,
  removeAccessGroupMember,
} from '@/api/manager.js'
import { useAuthStore } from '@/stores/authStore.js'
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

export const LOCK_REASONS = {
  REMOVED: 'removed',
  OTHER_AREA: 'other-area',
}

function toCollaborator({ id, name, email }, lockReason = null) {
  return { id, name, email, initials: getInitials(name), groupIds: [], lockReason }
}

function lockReasonOf(member) {
  return member.is_active === false ? LOCK_REASONS.REMOVED : LOCK_REASONS.OTHER_AREA
}

export function mergeCollaborators(areaUsers, groups, memberLists, currentUserId = null) {
  const byId = new Map(
    areaUsers
      .filter((user) => user.id !== currentUserId)
      .map((user) => [user.id, toCollaborator(user)]),
  )
  groups.forEach((group, index) => {
    for (const member of memberLists[index]) {
      if (member.user_id === currentUserId) continue
      const person =
        byId.get(member.user_id) ??
        toCollaborator(
          { id: member.user_id, name: member.name, email: member.email },
          lockReasonOf(member),
        )
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
  const auth = useAuthStore()

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
      const [groupsResponse, usersResponse] = await Promise.all([
        fetchAccessGroups(),
        fetchAreaCollaborators(),
      ])
      const loadedGroups = (groupsResponse?.results ?? [])
        .map(normalizeAccessGroup)
        .sort(compareNames)
      const memberResponses = await Promise.all(
        loadedGroups.map((group) => fetchAccessGroupMembers(group.id)),
      )
      if (request !== latestLoad) return
      groups.value = loadedGroups
      const memberLists = memberResponses.map((members) => members?.results ?? [])
      const areaUsers = usersResponse?.results ?? []
      collaborators.value = mergeCollaborators(
        areaUsers,
        groups.value,
        memberLists,
        auth.currentUser?.id ?? null,
      )
    } catch (failure) {
      if (request !== latestLoad) return
      const forbidden = failure?.status === 401 || failure?.status === 403
      error.value = forbidden ? PERMISSION_ERROR_MESSAGE : LOAD_ERROR_MESSAGE
    } finally {
      if (request === latestLoad) loading.value = false
    }
  }

  function openMembershipDialog(collaboratorId) {
    const person = collaborators.value.find((item) => item.id === collaboratorId)
    if (!person || person.lockReason) return
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
    if (!person || person.lockReason || savingMemberships.value) return
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
