import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { MAX_RECENT_SEARCHES, useRecentSearches } from '@/composables/useRecentSearches.js'
import * as searchHistoryApi from '@/api/searchHistory.js'

vi.mock('@/api/searchHistory.js', () => ({
  fetchSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  removeSearchHistoryTerm: vi.fn(),
}))

const HISTORY = ['Normas de estruturas metálicas', 'MIL-C-5541', 'Relatório de cargas']

function keydown(key) {
  return { key, preventDefault: vi.fn() }
}

async function openWith(history = HISTORY, options = {}) {
  searchHistoryApi.fetchSearchHistory.mockResolvedValue(history)
  const recent = useRecentSearches(options)
  recent.open()
  await flushPromises()
  return recent
}

describe('useRecentSearches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchHistoryApi.clearSearchHistory.mockResolvedValue(null)
    searchHistoryApi.removeSearchHistoryTerm.mockResolvedValue(null)
  })

  it('should load the history when it opens', async () => {
    const recent = await openWith()

    expect(searchHistoryApi.fetchSearchHistory).toHaveBeenCalledTimes(1)
    expect(recent.isVisible.value).toBe(true)
    expect(recent.visibleTerms.value).toEqual(HISTORY)
  })

  it('should not fetch again while it is already open', async () => {
    const recent = await openWith()

    recent.open()

    expect(searchHistoryApi.fetchSearchHistory).toHaveBeenCalledTimes(1)
  })

  it('should keep only unique terms ignoring case and spacing', async () => {
    const recent = await openWith(['Cargas', ' cargas ', 'CARGAS  ', 'Vigas', ''])

    expect(recent.visibleTerms.value).toEqual(['Cargas', 'Vigas'])
  })

  it('should show at most ten terms', async () => {
    const history = Array.from({ length: 15 }, (_, index) => `termo ${index}`)

    const recent = await openWith(history)

    expect(recent.visibleTerms.value).toHaveLength(MAX_RECENT_SEARCHES)
    expect(recent.visibleTerms.value[0]).toBe('termo 0')
  })

  it('should stay hidden when the history is empty', async () => {
    const recent = await openWith([])

    expect(recent.isOpen.value).toBe(true)
    expect(recent.isVisible.value).toBe(false)
  })

  it('should stay hidden when the history cannot be loaded', async () => {
    searchHistoryApi.fetchSearchHistory.mockRejectedValue(new Error('offline'))
    const recent = useRecentSearches()

    recent.open()
    await flushPromises()

    expect(recent.isVisible.value).toBe(false)
  })

  it('should filter the terms by what the user is typing', async () => {
    const recent = await openWith()

    recent.filterBy('CARGA')

    expect(recent.visibleTerms.value).toEqual(['Relatório de cargas'])
  })

  it('should show every term again when it reopens', async () => {
    const recent = await openWith()
    recent.filterBy('CARGA')

    recent.close()
    recent.open()
    await flushPromises()

    expect(recent.visibleTerms.value).toEqual(HISTORY)
  })

  it('should forward the selected term and close', async () => {
    const onSelect = vi.fn()
    const recent = await openWith(HISTORY, { onSelect })

    recent.select('MIL-C-5541')

    expect(onSelect).toHaveBeenCalledWith('MIL-C-5541')
    expect(recent.isOpen.value).toBe(false)
  })

  it('should walk through the terms with the arrow keys and select with enter', async () => {
    const onSelect = vi.fn()
    const recent = await openWith(HISTORY, { onSelect })

    recent.handleKeydown(keydown('ArrowDown'))
    recent.handleKeydown(keydown('ArrowDown'))
    expect(recent.activeIndex.value).toBe(1)

    recent.handleKeydown(keydown('ArrowUp'))
    recent.handleKeydown(keydown('ArrowUp'))
    expect(recent.activeIndex.value).toBe(HISTORY.length - 1)

    const enter = keydown('Enter')
    recent.handleKeydown(enter)
    expect(enter.preventDefault).toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledWith('Relatório de cargas')
  })

  it('should let enter submit the form when no term is highlighted', async () => {
    const onSelect = vi.fn()
    const recent = await openWith(HISTORY, { onSelect })

    const enter = keydown('Enter')
    recent.handleKeydown(enter)

    expect(enter.preventDefault).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('should close with escape and reopen with the arrow down', async () => {
    const recent = await openWith()

    recent.handleKeydown(keydown('Escape'))
    expect(recent.isOpen.value).toBe(false)

    recent.handleKeydown(keydown('ArrowDown'))
    await flushPromises()
    expect(recent.isVisible.value).toBe(true)
  })

  it('should remove a single term right away', async () => {
    const recent = await openWith()

    await recent.remove('MIL-C-5541')

    expect(searchHistoryApi.removeSearchHistoryTerm).toHaveBeenCalledWith('MIL-C-5541')
    expect(recent.visibleTerms.value).toEqual([
      'Normas de estruturas metálicas',
      'Relatório de cargas',
    ])
  })

  it('should restore the term when the removal fails', async () => {
    searchHistoryApi.removeSearchHistoryTerm.mockRejectedValue(new Error('offline'))
    const recent = await openWith()

    await recent.remove('MIL-C-5541')

    expect(recent.visibleTerms.value).toEqual(HISTORY)
  })

  it('should clear the whole history and hide the popover', async () => {
    const recent = await openWith()

    await recent.clear()

    expect(searchHistoryApi.clearSearchHistory).toHaveBeenCalledTimes(1)
    expect(recent.terms.value).toEqual([])
    expect(recent.isVisible.value).toBe(false)
  })

  it('should restore the history when clearing fails', async () => {
    searchHistoryApi.clearSearchHistory.mockRejectedValue(new Error('offline'))
    const recent = await openWith()

    await recent.clear()

    expect(recent.terms.value).toEqual(HISTORY)
  })

  it('should ignore a pending load that finishes after the history was cleared', async () => {
    let resolveLoad
    searchHistoryApi.fetchSearchHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )
    const recent = useRecentSearches()

    recent.open()
    const clearing = recent.clear()
    resolveLoad(HISTORY)
    await clearing
    await flushPromises()

    expect(recent.terms.value).toEqual([])
  })
})
