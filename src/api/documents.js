import { uploadWithProgress } from './client'

export function uploadDocument(file, { onProgress, forceNewRevision = false, signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (forceNewRevision) {
    formData.append('force_new_revision', 'true')
  }

  // Backend payload: { temp_file_id, original_name, file_size, inferred_type }.
  // Duplicate detection ({ duplicate, existingDocument }) is not implemented by the backend yet.
  return uploadWithProgress('/documents/upload', formData, { onProgress, signal })
}
