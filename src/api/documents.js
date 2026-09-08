import { uploadWithProgress } from './client'

export function uploadDocument(file, { onProgress, forceNewRevision = false, signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (forceNewRevision) {
    formData.append('force_new_revision', 'true')
  }

  // Expected backend payload: { id, duplicate, existingDocument?: { id, name, version } }
  return uploadWithProgress('/documents/', formData, { onProgress, signal })
}
