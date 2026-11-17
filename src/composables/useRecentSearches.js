import { computed, ref } from 'vue'
import {
  clearSearchHistory,
  fetchSearchHistory,
  removeSearchHistoryTerm,
} from '@/api/searchHistory.js'

export const MAX_RECENT_SEARCHES = 10

function normalizeTerm(term) {
  return String(term ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
}

function uniqueTerms(terms) {
  const seen = new Set()
  return terms.reduce((unique, term) => {
    const text = String(term ?? '').trim()
    const key = normalizeTerm(text)
    if (!key || seen.has(key)) return unique
    seen.add(key)
    unique.push(text)
    return unique
  }, [])
}

export function useRecentSearches({ onSelect = () => {} } = {}) {
  const terms = ref([])
  const filterText = ref('')
  const isOpen = ref(false)
  const activeIndex = ref(-1)
  let latestRequest = 0

  const visibleTerms = computed(() => {
    const filter = normalizeTerm(filterText.value)
    if (!filter) return terms.value
    return terms.value.filter((term) => normalizeTerm(term).includes(filter))
  })

  const isVisible = computed(() => isOpen.value && visibleTerms.value.length > 0)

  async function load() {
    const requestId = ++latestRequest
    try {
      const results = await fetchSearchHistory()
      if (requestId !== latestRequest) return
      terms.value = uniqueTerms(results).slice(0, MAX_RECENT_SEARCHES)
    } catch {
      return
    }
  }

  function open() {
    if (isOpen.value) return
    isOpen.value = true
    activeIndex.value = -1
    filterText.value = ''
    load()
  }

  function filterBy(text) {
    open()
    filterText.value = String(text ?? '')
    activeIndex.value = -1
  }

  function close() {
    isOpen.value = false
    activeIndex.value = -1
  }

  function setActive(index) {
    activeIndex.value = index
  }

  function moveActive(step) {
    const total = visibleTerms.value.length
    if (!total) return
    activeIndex.value = (activeIndex.value + step + total) % total
  }

  function select(term) {
    close()
    onSelect(term)
  }

  async function remove(term) {
    latestRequest++
    const previous = terms.value
    terms.value = previous.filter((item) => item !== term)
    activeIndex.value = Math.min(activeIndex.value, visibleTerms.value.length - 1)
    try {
      await removeSearchHistoryTerm(term)
    } catch {
      terms.value = previous
    }
  }

  async function clear() {
    latestRequest++
    const previous = terms.value
    terms.value = []
    activeIndex.value = -1
    try {
      await clearSearchHistory()
    } catch {
      terms.value = previous
    }
  }

  function handleKeydown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen.value) {
        open()
        return
      }
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (event.key === 'Escape' && isOpen.value) {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'Enter' && isVisible.value && activeIndex.value >= 0) {
      event.preventDefault()
      select(visibleTerms.value[activeIndex.value])
    }
  }

  return {
    terms,
    visibleTerms,
    isOpen,
    isVisible,
    activeIndex,
    open,
    close,
    load,
    filterBy,
    setActive,
    select,
    remove,
    clear,
    handleKeydown,
  }
}
