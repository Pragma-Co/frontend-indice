<script setup>
import { computed } from 'vue'
import { useDocumentFormStore } from '../../stores/documentFormStore'
import { AREAS, CONFIDENTIALITY_LEVELS, DOCUMENT_TYPES } from '../../utils/documentCatalog'
import BaseButton from '../common/BaseButton.vue'
import FormField from '../common/FormField.vue'
import TagMultiSelect from '../common/TagMultiSelect.vue'

const emit = defineEmits(['back', 'next'])
const store = useDocumentFormStore()

const code = computed(() => store.codePreview ?? '')
const canProceed = computed(() => store.isValid && !store.catalogsLoading)

/** Navigation between steps belongs to the flow (steps 1 and 3 are separate tasks). */
function next() {
  if (canProceed.value) emit('next')
}
</script>

<template>
  <form class="card metadata" novalidate @submit.prevent="next">
    <h2 class="metadata__title">Informações do Documento</h2>

    <p v-if="store.catalogsError" class="metadata__alert" role="alert">
      {{ store.catalogsError }}
      <button type="button" class="metadata__retry" @click="store.loadCatalogs()">Tentar novamente</button>
    </p>

    <div class="metadata__grid">
      <FormField label="Projeto Associado" html-for="project" required>
        <select id="project" v-model="store.form.projectId" :disabled="store.catalogsLoading">
          <option value="">{{ store.catalogsLoading ? 'Carregando…' : 'Buscar projeto…' }}</option>
          <option v-for="project in store.projects" :key="project.id" :value="project.id">
            {{ project.code }} - {{ project.name }}
          </option>
        </select>
      </FormField>

      <FormField label="Disciplina" html-for="discipline" required>
        <select id="discipline" v-model="store.form.disciplineId" :disabled="store.catalogsLoading">
          <option value="">{{ store.catalogsLoading ? 'Carregando…' : 'Selecione a disciplina' }}</option>
          <option v-for="discipline in store.disciplines" :key="discipline.id" :value="discipline.id">
            {{ discipline.acronym }} - {{ discipline.name }}
          </option>
        </select>
      </FormField>

      <FormField label="Tipo de documento" html-for="document-type" required>
        <select id="document-type" v-model="store.form.documentType">
          <option value="">Selecione o tipo</option>
          <option v-for="type in DOCUMENT_TYPES" :key="type.acronym" :value="type.acronym">
            {{ type.acronym }} - {{ type.name }}
          </option>
        </select>
      </FormField>

      <FormField label="Revisão" html-for="revision">
        <input id="revision" type="text" :value="store.form.revision" readonly />
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

      <FormField label="Título do Documento" html-for="title" required class="metadata__full">
        <input
          id="title"
          v-model="store.form.title"
          type="text"
          placeholder="Digite o título do documento…"
          maxlength="200"
        />
      </FormField>

      <FormField label="Descrição Breve" html-for="description" class="metadata__full">
        <textarea
          id="description"
          v-model="store.form.description"
          rows="3"
          placeholder="Descreva brevemente o conteúdo do documento…"
          maxlength="1000"
        />
      </FormField>

      <FormField label="Grau de Confidencialidade" required>
        <div class="metadata__radios" role="radiogroup" aria-label="Grau de Confidencialidade">
          <label v-for="level in CONFIDENTIALITY_LEVELS" :key="level.value" class="metadata__radio">
            <input v-model="store.form.confidentiality" type="radio" name="confidentiality" :value="level.value" />
            {{ level.label }}
          </label>
        </div>
      </FormField>

      <FormField label="Área(s) relacionada(s)" html-for="areas" required>
        <TagMultiSelect id="areas" v-model="store.form.areas" :options="AREAS" placeholder="Adicionar área…" />
      </FormField>

      <FormField label="Responsável / Autor" html-for="author" class="metadata__full">
        <input id="author" v-model="store.form.author" type="text" placeholder="Nome do responsável" />
      </FormField>
    </div>

    <footer class="metadata__actions">
      <BaseButton variant="secondary" @click="emit('back')">Anterior</BaseButton>
      <BaseButton type="submit" :disabled="!canProceed">Próximo Passo</BaseButton>
    </footer>
  </form>
</template>

<style scoped>
.metadata {
  padding: 1.5rem;
}

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
  background: var(--color-danger-soft);
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
