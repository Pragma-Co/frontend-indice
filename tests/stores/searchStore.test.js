import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSearchStore } from '@/stores/searchStore.js'

describe('searchStore', () => {
  let searchStore

  beforeEach(() => {
    setActivePinia(createPinia())
    searchStore = useSearchStore()
  })

  it('should start without a remembered search', () => {
    expect(searchStore.lastSearch).toEqual({})
    expect(searchStore.hasLastSearch).toBe(false)
  })

  it('should keep a copy of the last search', () => {
    const query = { q: 'tubulação', tipo: 'DWG' }

    searchStore.remember(query)
    query.q = 'changed'

    expect(searchStore.lastSearch).toEqual({ q: 'tubulação', tipo: 'DWG' })
    expect(searchStore.hasLastSearch).toBe(true)
  })

  it('should forget the last search', () => {
    searchStore.remember({ q: 'tubulação' })

    searchStore.forget()

    expect(searchStore.lastSearch).toEqual({})
  })
})
