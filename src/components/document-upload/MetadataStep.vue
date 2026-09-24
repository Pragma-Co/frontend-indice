<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { useDocumentFormStore } from '../../stores/documentFormStore'
import { useUploadStore } from '@/stores/uploadStore.js'
import { requestDocumentSuggestions } from '@/api/documents.js'
import { AREAS, CONFIDENTIALITY_LEVELS } from '../../utils/documentCatalog'
import Button from '../common/Button.vue'
import FormField from '../common/FormField.vue'
import TagMultiSelect from '../common/TagMultiSelect.vue'

const emit = defineEmits(['back', 'next'])
const store = useDocumentFormStore()
const uploadStore = useUploadStore()
const files = computed(() => uploadStore.uploadedDocuments)

const code = computed(() => store.codePreview ?? '')
const areaOptions = AREAS.map((area) => ({ value: area.code, label: area.name }))
const canProceed = computed(() => store.isValid && !store.catalogsLoading)
const disciplineLocked = computed(() => store.projectsCarryDisciplines && !store.selectedProject)
const disciplinePlaceholder = computed(() => {
  if (store.catalogsLoading) return 'Carregando…'
  if (disciplineLocked.value) return 'Selecione o projeto primeiro'
  return 'Selecione a disciplina'
})

function suggestedAreaCode(area) {
  const name = String(area?.name ?? '')
    .trim()
    .toLowerCase()
  if (!name) return null
  return AREAS.find((option) => option.name.toLowerCase() === name)?.code ?? null
}

function setSuggestions(suggestions) {
  if (!suggestions) return
  if (suggestions.project?.id) store.selectProject(suggestions.project.id)
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

const suggestionsStatus = ref('idle')

onMounted(() => {
  if (files.value.length === 0) {
    emit('back')
    return
  }
  if (!isFormEmpty()) return
  const file = files.value.reduce((biggest, current) => {
    return current.size > biggest.size ? current : biggest
  }, files.value[0])
  suggestionsStatus.value = 'loading'
  requestDocumentSuggestions(file.id)
    .then((response) => {
      setSuggestions(response)
      suggestionsStatus.value = 'success'
    })
    .catch((error) => {
      console.error('Erro ao buscar sugestões de documentos:', error)
      suggestionsStatus.value = 'error'
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

    <p v-if="suggestionsStatus === 'loading'" class="metadata__warning" role="alert">
      Carregando sugestões da API...
    </p>

    <p v-else-if="suggestionsStatus === 'success'" class="metadata__success" role="alert">
      Sugestões carregadas com sucesso! Você pode alterar os campos conforme necessário.
    </p>

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
        @focusout="touch('projectId')"
      >
        <select
          id="project"
          :value="store.form.projectId"
          :disabled="store.catalogsLoading"
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
        @focusout="touch('disciplineId')"
      >
        <select
          id="discipline"
          v-model="disciplineId"
          :disabled="store.catalogsLoading || disciplineLocked"
        >
          <option value="">{{ disciplinePlaceholder }}</option>
          <option
            v-for="discipline in store.availableDisciplines"
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
        @focusout="touch('documentType')"
      >
        <select id="document-type" v-model="documentType">
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
        @focusout="touch('title')"
      >
        <input
          id="title"
          v-model="title"
          type="text"
          placeholder="Digite o título do documento…"
          maxlength="255"
        />
      </FormField>

      <FormField
        label="Descrição Breve"
        html-for="description"
        class="metadata__full"
        :suggested="store.isFieldSuggested('description')"
      >
        <textarea
          id="description"
          v-model="description"
          rows="3"
          placeholder="Descreva brevemente o conteúdo do documento…"
          maxlength="500"
        />
      </FormField>

      <FormField label="Grau de Confidencialidade" required :error="fieldError('confidentiality')">
        <div class="metadata__radios" role="radiogroup" aria-label="Grau de Confidencialidade">
          <label v-for="level in CONFIDENTIALITY_LEVELS" :key="level.value" class="metadata__radio">
            <input
              v-model="store.form.confidentiality"
              type="radio"
              name="confidentiality"
              :value="level.value"
            />
            {{ level.label }}
          </label>
        </div>
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
        label="Área(s) relacionada(s)"
        html-for="areas"
        required
        class="metadata__full"
        :error="fieldError('areas')"
        :suggested="store.isFieldSuggested('areas')"
        @focusout="touch('areas')"
      >
        <TagMultiSelect
          id="areas"
          v-model="areas"
          :options="areaOptions"
          placeholder="Adicionar área…"
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

.metadata__warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: 0.85rem;
}

.metadata__success {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--color-success-bg);
  color: var(--color-success);
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
