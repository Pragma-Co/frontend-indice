import { computed, ref, watch } from 'vue'
import { fetchDocumentRecommendations } from '@/api/recommendations.js'

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar os documentos recomendados.'

function reasonsOf(matches = {}) {
  const reasons = []
  if (matches.project) reasons.push('Mesmo projeto')
  if (matches.discipline) reasons.push('Mesma disciplina')
  if (matches.type) reasons.push('Mesmo tipo')
  for (const tag of matches.tags ?? []) reasons.push(`#${tag}`)
  for (const theme of matches.themes ?? []) reasons.push(`#${theme}`)
  for (const area of matches.areas ?? []) reasons.push(`Área ${area}`)
  return reasons
}

export function normalizeRecommendedDocument(item) {
  return {
    id: item.id,
    code: item.code ?? '-',
    title: item.title ?? '-',
    type: item.type?.name ?? null,
    discipline: item.discipline?.name ?? null,
    revision: item.revision?.label ?? null,
    status: item.status ?? null,
    reasons: reasonsOf(item.matches),
  }
}

export function normalizeCollection(collection) {
  return {
    key: collection.key,
    title: collection.title ?? collection.key,
    count: collection.count ?? collection.items?.length ?? 0,
    items: (collection.items ?? []).map(normalizeRecommendedDocument),
  }
}

export function useDocumentRecommendations(documentId) {
  const collections = ref([])
  const loading = ref(true)
  const error = ref('')
  const activeKey = ref(null)
  let latestRequest = 0

  const activeCollection = computed(
    () => collections.value.find((collection) => collection.key === activeKey.value) ?? null,
  )

  async function load() {
    const id = documentId.value
    const request = ++latestRequest
    loading.value = true
    error.value = ''
    try {
      const response = await fetchDocumentRecommendations(id)
      if (request !== latestRequest) return
      collections.value = (response?.collections ?? [])
        .map(normalizeCollection)
        .filter((collection) => collection.items.length)
      activeKey.value = collections.value[0]?.key ?? null
    } catch {
      if (request !== latestRequest) return
      collections.value = []
      activeKey.value = null
      error.value = LOAD_ERROR_MESSAGE
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  function selectCollection(key) {
    if (collections.value.some((collection) => collection.key === key)) activeKey.value = key
  }

  watch(
    documentId,
    (id) => {
      if (id) load()
    },
    { immediate: true },
  )

  return { collections, activeKey, activeCollection, loading, error, load, selectCollection }
}
