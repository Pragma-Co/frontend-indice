import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useFileSelection } from '../../src/composables/useFileSelection'

function setup() {
  const items = ref([
    { id: 1, name: 'a.pdf' },
    { id: 2, name: 'b.pdf' },
    { id: 3, name: 'c.pdf' },
  ])
  const onRemove = vi.fn((ids) => {
    items.value = items.value.filter((item) => !ids.includes(item.id))
  })
  return { items, onRemove, selection: useFileSelection(items, { onRemove }) }
}

describe('useFileSelection', () => {
  it('should select and unselect a single file', () => {
    const { selection } = setup()

    selection.toggle(2)
    const selectedAfterFirstToggle = selection.isSelected(2)
    selection.toggle(2)

    expect(selectedAfterFirstToggle).toBe(true)
    expect(selection.isSelected(2)).toBe(false)
    expect(selection.hasSelection.value).toBe(false)
  })

  it('should select several files and toggle all of them', () => {
    const { selection } = setup()

    selection.toggle(1)
    selection.toggle(3)
    expect(selection.selectedCount.value).toBe(2)
    expect(selection.allSelected.value).toBe(false)

    selection.toggleAll()
    expect(selection.selectedIds.value).toEqual([1, 2, 3])
    expect(selection.allSelected.value).toBe(true)

    selection.toggleAll()
    expect(selection.selectedIds.value).toEqual([])
  })

  it('should not request a removal when nothing is selected', () => {
    const { selection, onRemove } = setup()

    const requested = selection.requestRemoval()
    selection.confirmRemoval()

    expect(requested).toBe(false)
    expect(selection.confirmingRemoval.value).toBe(false)
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('should wait for the confirmation before removing the selected files', () => {
    const { selection, onRemove } = setup()
    selection.toggle(1)
    selection.toggle(3)

    selection.requestRemoval()

    expect(onRemove).not.toHaveBeenCalled()
    expect(selection.confirmingRemoval.value).toBe(true)
    expect(selection.pendingRemovalItems.value.map((item) => item.name)).toEqual(['a.pdf', 'c.pdf'])
  })

  it('should remove only the selected files once confirmed', async () => {
    const { items, selection, onRemove } = setup()
    selection.toggle(2)
    selection.requestRemoval()

    selection.confirmRemoval()
    await nextTick()

    expect(onRemove).toHaveBeenCalledWith([2])
    expect(items.value.map((item) => item.id)).toEqual([1, 3])
    expect(selection.selectedIds.value).toEqual([])
    expect(selection.confirmingRemoval.value).toBe(false)
  })

  it('should keep the files and the selection when the removal is cancelled', () => {
    const { items, selection, onRemove } = setup()
    selection.toggle(2)
    selection.requestRemoval()

    selection.cancelRemoval()

    expect(onRemove).not.toHaveBeenCalled()
    expect(items.value).toHaveLength(3)
    expect(selection.selectedIds.value).toEqual([2])
    expect(selection.confirmingRemoval.value).toBe(false)
  })

  it('should remove a single file on request without changing the selection', () => {
    const { selection, onRemove } = setup()
    selection.toggle(1)

    selection.requestRemoval([3])
    selection.confirmRemoval()

    expect(onRemove).toHaveBeenCalledWith([3])
    expect(selection.selectedIds.value).toEqual([1])
  })

  it('should ignore files that are no longer listed', async () => {
    const { items, selection, onRemove } = setup()
    selection.toggle(1)
    selection.toggle(2)
    selection.requestRemoval()

    items.value = items.value.filter((item) => item.id !== 1)
    await nextTick()
    selection.confirmRemoval()

    expect(selection.pendingRemovalItems.value).toEqual([])
    expect(onRemove).toHaveBeenCalledWith([2])
  })
})
