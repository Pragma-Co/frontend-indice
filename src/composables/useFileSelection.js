import { computed, ref, watch } from 'vue'

export function useFileSelection(items, { onRemove }) {
  const selectedIds = ref([])
  const pendingRemovalIds = ref([])

  const availableIds = computed(() => items.value.map((item) => item.id))
  const selectedCount = computed(() => selectedIds.value.length)
  const hasSelection = computed(() => selectedCount.value > 0)
  const allSelected = computed(
    () => availableIds.value.length > 0 && selectedCount.value === availableIds.value.length,
  )
  const pendingRemovalItems = computed(() =>
    items.value.filter((item) => pendingRemovalIds.value.includes(item.id)),
  )
  const confirmingRemoval = computed(() => pendingRemovalItems.value.length > 0)

  watch(availableIds, (ids) => {
    selectedIds.value = selectedIds.value.filter((id) => ids.includes(id))
    pendingRemovalIds.value = pendingRemovalIds.value.filter((id) => ids.includes(id))
  })

  function isSelected(id) {
    return selectedIds.value.includes(id)
  }

  function toggle(id) {
    selectedIds.value = isSelected(id)
      ? selectedIds.value.filter((selectedId) => selectedId !== id)
      : [...selectedIds.value, id]
  }

  function toggleAll() {
    selectedIds.value = allSelected.value ? [] : [...availableIds.value]
  }

  function clearSelection() {
    selectedIds.value = []
  }

  function requestRemoval(ids = selectedIds.value) {
    const validIds = ids.filter((id) => availableIds.value.includes(id))
    if (!validIds.length) return false
    pendingRemovalIds.value = validIds
    return true
  }

  function cancelRemoval() {
    pendingRemovalIds.value = []
  }

  function confirmRemoval() {
    const ids = pendingRemovalItems.value.map((item) => item.id)
    pendingRemovalIds.value = []
    if (!ids.length) return
    onRemove(ids)
    selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id))
  }

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    allSelected,
    pendingRemovalItems,
    confirmingRemoval,
    isSelected,
    toggle,
    toggleAll,
    clearSelection,
    requestRemoval,
    cancelRemoval,
    confirmRemoval,
  }
}
