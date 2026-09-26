import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useDocumentUpload } from '../../src/composables/useDocumentUpload'
import { uploadDocument } from '../../src/api/documents'

vi.mock('../../src/api/documents', () => ({ uploadDocument: vi.fn() }))

describe('useDocumentUpload', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should block a duplicate file in the same queue and expose its warning state', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn(async (_algorithm, content) => content),
      },
    })
    uploadDocument.mockResolvedValue({ temp_file_id: 'temp-1' })
    const { queue, addFiles } = useDocumentUpload()
    const sameContent = new TextEncoder().encode('same document').buffer
    const files = ['original.pdf', 'copy.pdf'].map((name) => ({
      name,
      size: sameContent.byteLength,
      arrayBuffer: async () => sameContent,
    }))

    addFiles(files)
    await flushPromises()

    expect(queue.value.map((item) => item.status)).toEqual(['success', 'duplicate'])
    expect(uploadDocument).toHaveBeenCalledTimes(1)
    expect(queue.value[1].name).toBe('copy.pdf')
  })
})
