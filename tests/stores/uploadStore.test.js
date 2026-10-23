import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUploadStore } from '../../src/stores/uploadStore'

describe('uploadStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should remove only the requested documents', () => {
    const store = useUploadStore()
    store.setUploadedDocuments([{ id: 'up-1' }, { id: 'up-2' }, { id: 'up-3' }])

    store.removeDocuments(['up-1', 'up-3'])

    expect(store.uploadedDocuments).toEqual([{ id: 'up-2' }])
  })
})
