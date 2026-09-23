import { computed, ref } from 'vue'
import { uploadDocument } from '../api/documents'
import { getFileTypeLabel } from '../utils/formatters'
import { isFileSizeValid, isFileTypeAccepted } from '../utils/validators'

const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpeg', 'png']
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
const MAX_CONCURRENT_UPLOADS = 2
const SETTLED_STATUSES = ['success', 'invalid', 'revision']

let nextId = 1

export function useDocumentUpload({ getUserId = () => undefined } = {}) {
  const queue = ref([])

  const hasSucceededFile = computed(() => queue.value.some((item) => item.status === 'success'))
  const allSettled = computed(
    () =>
      queue.value.length > 0 && queue.value.every((item) => SETTLED_STATUSES.includes(item.status)),
  )

  function addFiles(fileList) {
    const files = Array.from(fileList)

    for (const file of files) {
      const item = {
        id: nextId++,
        file,
        name: file.name,
        size: file.size,
        typeLabel: getFileTypeLabel(file.name),
        status: 'validating',
        progress: 0,
        error: null,
        duplicateInfo: null,
        revisionInfo: null,
      }
      queue.value.push(item)
      validateAndQueue(item)
    }
  }

  function validateAndQueue(item) {
    if (!isFileTypeAccepted(item.file, ACCEPTED_EXTENSIONS)) {
      item.status = 'invalid'
      item.error = 'Formato não suportado'
      return
    }
    if (!isFileSizeValid(item.file, MAX_FILE_SIZE_BYTES)) {
      item.status = 'invalid'
      item.error = 'Arquivo muito grande'
      return
    }

    item.status = 'ready'
    processQueue()
  }

  function activeUploadsCount() {
    return queue.value.filter((item) => item.status === 'uploading').length
  }

  function processQueue() {
    while (activeUploadsCount() < MAX_CONCURRENT_UPLOADS) {
      const next = queue.value.find((item) => item.status === 'ready')
      if (!next) return
      startUpload(next)
    }
  }

  async function startUpload(item, { forceNewRevision = false } = {}) {
    item.status = 'uploading'
    item.progress = 0

    try {
      const response = await uploadDocument(item.file, {
        forceNewRevision,
        userId: getUserId(),
        onProgress: (percent) => {
          item.progress = percent
        },
      })

      if (response?.duplicate && !forceNewRevision) {
        item.status = 'duplicate'
        item.duplicateInfo = response.document ?? null
        return
      }

      if (response?.revision_created) {
        item.status = 'revision'
        item.revisionInfo = response.document ?? null
        return
      }

      item.status = 'success'
      item.documentId = response?.temp_file_id ?? null
    } catch (err) {
      item.status = 'error'
      item.error = err.message
    } finally {
      processQueue()
    }
  }

  function resolveDuplicate(item, keepAsNewRevision) {
    if (!keepAsNewRevision) {
      removeFile(item.id)
      return
    }
    startUpload(item, { forceNewRevision: true })
  }

  function removeFile(id) {
    queue.value = queue.value.filter((item) => item.id !== id)
    processQueue()
  }

  function reset() {
    queue.value = []
  }

  function restore(documents) {
    queue.value = documents.map((document) => ({
      id: nextId++,
      file: null,
      name: document.name,
      size: document.size,
      typeLabel: document.typeLabel,
      status: 'success',
      progress: 100,
      error: null,
      duplicateInfo: null,
      documentId: document.id,
    }))
  }

  return {
    queue,
    hasSucceededFile,
    allSettled,
    addFiles,
    removeFile,
    resolveDuplicate,
    reset,
    restore,
    ACCEPTED_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
  }
}
