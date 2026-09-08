/**
 * Central HTTP client. Every request goes through the Vite proxy under `/api`
 * (see vite.config.js), so the browser never talks to the backend directly.
 */
const BASE_URL = '/api'

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// User-facing messages only: never expose hosts, stack traces or raw backend
// error strings in the UI (LGPD / security rule from the README).
function messageFor(status) {
  if (status === 400) return 'Dados inválidos. Verifique os campos e tente novamente.'
  if (status === 401 || status === 403) return 'Você não tem permissão para esta ação.'
  if (status === 404) return 'Recurso não encontrado.'
  if (status === 409) return 'Já existe um documento com este código.'
  if (status >= 500) return 'Erro interno do servidor. Tente novamente mais tarde.'
  return 'Não foi possível concluir a operação.'
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const init = { method, headers: { Accept: 'application/json', ...headers } }

  if (body !== undefined) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
    if (isFormData) {
      init.body = body
    } else {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', { status: 0 })
  }

  const data = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(messageFor(response.status), { status: response.status, details: data })
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
}
