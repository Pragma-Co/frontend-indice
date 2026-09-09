const API_BASE_URL = '/api'

export function uploadWithProgress(path, formData, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      let body = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        body = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body)
      } else {
        reject(Object.assign(new Error(`Upload failed with status ${xhr.status}`), { status: xhr.status, body }))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error while uploading file'))
    })

    xhr.addEventListener('abort', () => {
      reject(Object.assign(new Error('Upload aborted'), { name: 'AbortError' }))
    })

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort())
    }

    xhr.send(formData)
  })
}
