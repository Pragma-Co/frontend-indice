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

  it('should accept a file again after it was removed from the queue', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn(async (_algorithm, content) => content),
      },
    })
    uploadDocument.mockResolvedValue({ temp_file_id: 'temp-1' })
    const { queue, addFiles, removeFile } = useDocumentUpload()
    const content = new TextEncoder().encode('revision file').buffer
    const file = { name: 'report.pdf', size: content.byteLength, arrayBuffer: async () => content }
    addFiles([file])
    await flushPromises()

    removeFile(queue.value[0].id)
    addFiles([file])
    await flushPromises()

    expect(queue.value.map((item) => item.status)).toEqual(['success'])
  })

  it('should remove only the requested files in a single operation', () => {
    const { queue, restore, removeFiles } = useDocumentUpload()
    restore([
      { id: 'temp-1', name: 'a.pdf', size: 1 },
      { id: 'temp-2', name: 'b.pdf', size: 2 },
      { id: 'temp-3', name: 'c.pdf', size: 3 },
    ])
    const [first, , third] = queue.value

    const removed = removeFiles([first.id, third.id, 9999])

    expect(removed.map((item) => item.name)).toEqual(['a.pdf', 'c.pdf'])
    expect(queue.value.map((item) => item.name)).toEqual(['b.pdf'])
  })

  it('should cancel the upload of a file removed while it is being sent', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn(async (_algorithm, content) => content),
      },
    })
    let uploadSignal
    uploadDocument.mockImplementation(
      (_file, { signal }) =>
        new Promise((_resolve, reject) => {
          uploadSignal = signal
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('Upload aborted'), { name: 'AbortError' })),
          )
        }),
    )
    const { queue, addFiles, removeFiles } = useDocumentUpload()
    const content = new TextEncoder().encode('slow upload').buffer
    addFiles([{ name: 'slow.pdf', size: content.byteLength, arrayBuffer: async () => content }])
    await flushPromises()
    expect(queue.value[0].status).toBe('uploading')

    removeFiles([queue.value[0].id])
    await flushPromises()

    expect(uploadSignal.aborted).toBe(true)
    expect(queue.value).toEqual([])
  })
})
