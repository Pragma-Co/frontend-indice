<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useDocumentFormStore } from '../../stores/documentFormStore'
import { useUploadStore } from '@/stores/uploadStore.js'
import { useAuthStore } from '@/stores/authStore.js'
import { streamDocumentSuggestions } from '@/api/documents.js'
import { CONFIDENTIALITY_LEVELS } from '../../utils/documentCatalog'
import Button from '../common/Button.vue'
import FormField from '../common/FormField.vue'
import TagMultiSelect from '../common/TagMultiSelect.vue'
import AiSuggestionStatus from './AiSuggestionStatus.vue'

const emit = defineEmits(['back', 'next'])
const store = useDocumentFormStore()
const uploadStore = useUploadStore()
const authStore = useAuthStore()
const files = computed(() => uploadStore.uploadedDocuments)

const code = computed(() => store.codePreview ?? '')
const areaOptions = computed(() =>
  store.areas.map((area) => ({ value: area.acronym, label: area.name })),
)
const suggestionsStatus = ref('idle')
const aiClassifying = computed(() => suggestionsStatus.value === 'loading')
const aiWorking = computed(() => ['loading', 'generating'].includes(suggestionsStatus.value))
const aiStatusVisible = computed(() => aiWorking.value || suggestionsStatus.value === 'success')
const canProceed = computed(() => store.isValid && !store.catalogsLoading && !aiWorking.value)
const isSecret = computed(() => store.form.confidentiality === 'SECRET')
const isConfidential = computed(() => store.form.confidentiality === 'CONFIDENTIAL')
const groupOptions = computed(() =>
  store.accessGroups
    .filter((group) => group.secrecy_level !== 'PUBLIC')
    .map((group) => ({ value: String(group.id), label: group.name })),
)
const userOptions = computed(() =>
  store.users
    .filter((user) => user.id !== authStore.currentUser?.id)
    .map((user) => ({ value: String(user.id), label: `${user.name} (${user.email})` })),
)
const accessField = computed(() => {
  if (isSecret.value) {
    return {
      label: 'Usuários com acesso',
      model: 'authorizedUsers',
      options: userOptions.value,
      placeholder: store.usersLoading ? 'Carregando…' : 'Adicionar usuário…',
      required: true,
    }
  }
  if (isConfidential.value) {
    return {
      label: 'Grupos de acesso',
      model: 'authorizedGroups',
      options: groupOptions.value,
      placeholder: store.accessGroupsLoading ? 'Carregando…' : 'Adicionar grupo…',
      required: false,
    }
  }
  return {
    label: 'Acesso restrito a',
    model: null,
    options: [],
    placeholder: 'Não se aplica a documentos públicos',
    required: false,
  }
})
const accessSelection = computed({
  get: () => (accessField.value.model ? store.form[accessField.value.model] : []),
  set: (value) => {
    if (accessField.value.model) store.form[accessField.value.model] = value
  },
})

watch(
  isConfidential,
  (confidential) => {
    if (confidential) store.loadAccessGroups()
  },
  { immediate: true },
)

watch(isSecret, (secret) => {
  if (secret) store.loadUsers()
})
const disciplinePlaceholder = computed(() => {
  if (store.catalogsLoading) return 'Carregando…'
  return 'Selecione a disciplina'
})

function suggestedAreaCode(area) {
  const name = String(area?.name ?? '')
    .trim()
    .toLowerCase()
  if (!name) return null
  return store.areas.find((option) => option.name.toLowerCase() === name)?.acronym ?? null
}

function setSuggestions(suggestions) {
  if (!suggestions) return
  const areaCode = suggestedAreaCode(suggestions.area)
  store.applySuggestions({
    projectId: suggestions.project?.id,
    disciplineId: suggestions.discipline?.id,
    documentType: suggestions.document_type?.id,
    title: suggestions.title,
    description: suggestions.description,
    areas: areaCode ? [areaCode] : [],
  })
}

function isFormEmpty() {
  const { projectId, disciplineId, documentType, title, description } = store.form
  return !projectId && !disciplineId && !documentType && !title && !description
}

const STREAMED_TEXT_FIELDS = ['title', 'description']
const suggestionsRequest = new AbortController()
const streamedText = {}

function showStreamedText(field, value) {
  streamedText[field] = value
  store.applySuggestions({ [field]: value })
}

function dropUnfinishedText(field) {
  if (!streamedText[field]) return
  store.form[field] = ''
  store.clearSuggestion(field)
  streamedText[field] = ''
}

function finishStreamedText(suggestion) {
  for (const field of STREAMED_TEXT_FIELDS) {
    if (suggestion?.[field]) showStreamedText(field, suggestion[field])
    else dropUnfinishedText(field)
  }
}

function failSuggestions() {
  STREAMED_TEXT_FIELDS.forEach(dropUnfinishedText)
  suggestionsStatus.value = 'error'
}

function fillManually() {
  suggestionsRequest.abort()
  STREAMED_TEXT_FIELDS.forEach(dropUnfinishedText)
  suggestionsStatus.value = 'idle'
}

function handleSuggestionEvent(event) {
  if (!aiWorking.value) return
  if (event?.type === 'classification') {
    setSuggestions({ ...event.suggestion, title: null, description: null })
    suggestionsStatus.value = 'generating'
  } else if (event?.type === 'text' && STREAMED_TEXT_FIELDS.includes(event.field)) {
    showStreamedText(event.field, event.value)
  } else if (event?.type === 'done') {
    finishStreamedText(event.suggestion)
    suggestionsStatus.value = 'success'
  } else if (event?.type === 'error') {
    failSuggestions()
  }
}

onBeforeUnmount(() => suggestionsRequest.abort())

onMounted(async () => {
  if (files.value.length === 0) {
    emit('back')
    return
  }
  if (!store.projects.length || !store.disciplines.length || !store.areas.length)
    await store.loadCatalogs()
  if (isSecret.value) store.loadUsers()
  if (!isFormEmpty()) return
  const file = files.value.reduce((biggest, current) => {
    return current.size > biggest.size ? current : biggest
  }, files.value[0])
  suggestionsStatus.value = 'loading'
  streamDocumentSuggestions(file.id, {
    onEvent: handleSuggestionEvent,
    signal: suggestionsRequest.signal,
  })
    .then(() => {
      if (suggestionsStatus.value !== 'success') failSuggestions()
    })
    .catch((error) => {
      if (error?.name === 'AbortError') return
      console.error('Erro ao buscar sugestões de documentos:', error)
      failSuggestions()
    })
})

const touched = reactive({})

function touch(field) {
  touched[field] = true
}

function fieldError(field) {
  return store.serverErrors[field] ?? (touched[field] ? (store.errors[field] ?? '') : '')
}

function fieldModel(field) {
  return computed({
    get: () => store.form[field],
    set: (value) => {
      store.form[field] = value
      store.clearSuggestion(field)
    },
  })
}

const disciplineId = fieldModel('disciplineId')
const documentType = fieldModel('documentType')
const title = fieldModel('title')
const description = fieldModel('description')
const areas = fieldModel('areas')

watch(
  () => ({ ...store.form }),
  (current, previous) => {
    for (const field of Object.keys(current)) {
      if (current[field] !== previous[field]) store.clearServerError(field)
    }
  },
)

function next() {
  if (canProceed.value) emit('next')
}

function back(event) {
  event?.preventDefault?.()
  emit('back')
}
</script>

<template>
  <form class="card metadata" novalidate @submit.prevent="next">
    <h2 class="metadata__title">Informações do Documento</h2>

    <AiSuggestionStatus v-if="aiStatusVisible" :status="suggestionsStatus" @skip="fillManually" />

    <p v-if="store.catalogsError" class="metadata__alert" role="alert">
      {{ store.catalogsError }}
      <button type="button" class="metadata__retry" @click="store.loadCatalogs()">
        Tentar novamente
      </button>
    </p>

    <div class="metadata__grid">
      <FormField
        label="Projeto Associado"
        html-for="project"
        required
        icon="search"
        :error="fieldError('projectId')"
        :suggested="store.isFieldSuggested('projectId')"
        :busy="aiClassifying"
        @focusout="touch('projectId')"
      >
        <select
          id="project"
          :value="store.form.projectId"
          :disabled="store.catalogsLoading || aiClassifying"
          @change="store.selectProject($event.target.value)"
        >
          <option value="">{{ store.catalogsLoading ? 'Carregando…' : 'Buscar projeto…' }}</option>
          <option v-for="project in store.projects" :key="project.id" :value="project.id">
            {{ project.code }} - {{ project.name }}
          </option>
        </select>
      </FormField>

      <FormField
        label="Disciplina"
        html-for="discipline"
        required
        icon="document"
        :error="fieldError('disciplineId')"
        :suggested="store.isFieldSuggested('disciplineId')"
        :busy="aiClassifying"
        @focusout="touch('disciplineId')"
      >
        <select
          id="discipline"
          v-model="disciplineId"
          :disabled="store.catalogsLoading || aiClassifying"
        >
          <option value="">{{ disciplinePlaceholder }}</option>
          <option
            v-for="discipline in store.disciplines"
            :key="discipline.id"
            :value="discipline.id"
          >
            {{ discipline.code }} - {{ discipline.name }}
          </option>
        </select>
      </FormField>

      <FormField
        label="Tipo de documento"
        html-for="document-type"
        required
        icon="document"
        :error="fieldError('documentType')"
        :suggested="store.isFieldSuggested('documentType')"
        :busy="aiClassifying"
        @focusout="touch('documentType')"
      >
        <select id="document-type" v-model="documentType" :disabled="aiClassifying">
          <option value="">Selecione o tipo</option>
          <option v-for="type in store.documentTypes" :key="type.id" :value="type.id">
            {{ type.code }} - {{ type.name }}
          </option>
        </select>
      </FormField>

      <FormField label="Revisão" html-for="revision" icon="document">
        <input id="revision" type="text" :value="store.revision" readonly />
      </FormField>

      <FormField label="Código/ID" html-for="code" class="metadata__full">
        <input
          id="code"
          type="text"
          :value="code"
          placeholder="Gerado automaticamente a partir de projeto, disciplina e tipo"
          readonly
        />
      </FormField>

      <FormField
        label="Título do Documento"
        html-for="title"
        required
        class="metadata__full"
        :error="fieldError('title')"
        :suggested="store.isFieldSuggested('title')"
        :busy="aiWorking"
        @focusout="touch('title')"
      >
        <input
          id="title"
          v-model="title"
          type="text"
          :placeholder="
            aiWorking ? 'A IA está escrevendo o título…' : 'Digite o título do documento…'
          "
          :disabled="aiWorking"
          maxlength="255"
        />
      </FormField>

      <FormField
        label="Descrição Breve"
        html-for="description"
        class="metadata__full"
        :suggested="store.isFieldSuggested('description')"
        :busy="aiWorking"
      >
        <textarea
          id="description"
          v-model="description"
          rows="3"
          :placeholder="
            aiWorking
              ? 'A IA está escrevendo a descrição…'
              : 'Descreva brevemente o conteúdo do documento…'
          "
          :disabled="aiWorking"
          maxlength="500"
        />
      </FormField>

      <FormField label="Grau de Confidencialidade" required :error="fieldError('confidentiality')">
        <div class="metadata__radios" role="radiogroup" aria-label="Grau de Confidencialidade">
          <label v-for="level in CONFIDENTIALITY_LEVELS" :key="level.value" class="metadata__radio">
            <input
              type="radio"
              name="confidentiality"
              :value="level.value"
              :checked="store.form.confidentiality === level.value"
              @change="store.setConfidentiality(level.value)"
            />
            {{ level.label }}
          </label>
        </div>
      </FormField>

      <FormField
        :label="accessField.label"
        html-for="access-select"
        :required="accessField.required"
        :error="fieldError(accessField.model ?? '')"
        @focusout="accessField.model && touch(accessField.model)"
      >
        <TagMultiSelect
          id="access-select"
          v-model="accessSelection"
          :options="accessField.options"
          :placeholder="accessField.placeholder"
          :disabled="!accessField.model || (isSecret && store.usersLoading)"
        />
        <p v-if="isSecret && store.usersError" class="metadata__author-error" role="alert">
          {{ store.usersError }}
        </p>
        <p
          v-if="isConfidential && store.accessGroupsError"
          class="metadata__author-error"
          role="alert"
        >
          {{ store.accessGroupsError }}
        </p>
      </FormField>

      <div class="metadata__author-field">
        <label class="metadata__label" for="author">
          Responsável / Autor
          <span class="metadata__required" aria-hidden="true">*</span>
        </label>
        <div
          class="metadata__author"
          :class="{ 'metadata__author--invalid': fieldError('author') }"
        >
          <input
            id="author"
            v-model="store.form.author"
            type="text"
            placeholder="Responsável / Autor"
            required
            @blur="touch('author')"
          />
        </div>
        <p v-if="fieldError('author')" class="metadata__author-error" role="alert">
          {{ fieldError('author') }}
        </p>
      </div>

      <FormField
        label="Área(s) relacionada(s) ao documento"
        html-for="areas"
        required
        :error="fieldError('areas')"
        :suggested="store.isFieldSuggested('areas')"
        :busy="aiClassifying"
        @focusout="touch('areas')"
      >
        <TagMultiSelect
          id="areas"
          v-model="areas"
          :options="areaOptions"
          placeholder="Adicionar área…"
          :disabled="aiClassifying"
        />
      </FormField>
    </div>

    <footer class="metadata__actions">
      <Button variant="outline" @click="back">Anterior</Button>
      <Button variant="primary" :disabled="!canProceed">Próximo Passo</Button>
    </footer>
  </form>
</template>

<style scoped>
.metadata__title {
  font-size: 1rem;
  margin-bottom: 1.25rem;
}

.metadata__alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--color-danger-bg);
  color: var(--color-danger);
  font-size: 0.85rem;
}

.metadata__retry {
  border: none;
  background: transparent;
  text-decoration: underline;
  cursor: pointer;
}

.metadata__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 1.5rem;
}

.metadata__full {
  grid-column: 1 / -1;
}

.metadata__radios {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.4rem;
}

.metadata__radio {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
}

.metadata__radio input {
  width: auto;
}

.metadata__author-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.metadata__label {
  font-size: 0.85rem;
  font-weight: 600;
}

.metadata__required {
  color: var(--color-danger);
  margin-left: 0.15rem;
}

.metadata__author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.metadata__author input {
  flex: 1;
  padding: 0.4rem 0;
  border: none;
  background: transparent;
}

.metadata__author input:focus {
  outline: none;
}

.metadata__author:focus-within {
  border-color: var(--color-primary);
}

.metadata__author--invalid {
  border-color: var(--color-danger);
}

.metadata__author-error {
  font-size: 0.8rem;
  color: var(--color-danger);
}

.metadata__actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

@media (max-width: 720px) {
  .metadata__grid {
    grid-template-columns: 1fr;
  }
}
</style>
