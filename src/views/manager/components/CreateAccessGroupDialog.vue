<script setup>
import { computed, reactive, ref } from 'vue'
import Button from '@/components/common/Button.vue'
import FormField from '@/components/common/FormField.vue'
import AccessGroupDialogShell from '@/views/manager/components/AccessGroupDialogShell.vue'
import { CONFIDENTIALITY_LEVELS } from '@/utils/documentCatalog.js'

const NAME_MAX_LENGTH = 120
const DESCRIPTION_MAX_LENGTH = 500
const FORM_ID = 'create-access-group-form'

const props = defineProps({
  groups: { type: Array, required: true },
  areaName: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
  serverErrors: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'submit', 'edit'])

const levelOptions = computed(() => {
  const usedLevels = props.groups.map((group) => group.secrecyLevel)
  return CONFIDENTIALITY_LEVELS.map((level) => ({
    ...level,
    taken: usedLevels.includes(level.value),
  }))
})

const noLevelAvailable = computed(() => levelOptions.value.every((level) => level.taken))

const form = reactive({
  name: '',
  description: '',
  secrecyLevel: levelOptions.value.find((level) => !level.taken)?.value ?? '',
})

const nameRequiredError = ref('')

const nameError = computed(() => nameRequiredError.value || props.serverErrors.name || '')

function onEdit() {
  nameRequiredError.value = ''
  emit('edit')
}

function submit() {
  const name = form.name.trim()
  if (!name) {
    nameRequiredError.value = 'Informe o nome do grupo.'
    return
  }
  if (noLevelAvailable.value) return
  emit('submit', {
    name,
    description: form.description.trim(),
    secrecyLevel: form.secrecyLevel,
  })
}
</script>

<template>
  <AccessGroupDialogShell
    title="Criar Grupo de Acesso"
    :subtitle="areaName ? `Área: ${areaName}` : ''"
    :busy="submitting"
    @close="emit('close')"
  >
    <form :id="FORM_ID" class="group-form" novalidate @submit.prevent="submit">
      <FormField
        label="Nome do grupo"
        html-for="access-group-name"
        required
        :error="nameError"
        error-id="access-group-name-error"
      >
        <input
          id="access-group-name"
          v-model="form.name"
          type="text"
          :maxlength="NAME_MAX_LENGTH"
          :disabled="submitting"
          :aria-invalid="nameError ? 'true' : undefined"
          :aria-describedby="nameError ? 'access-group-name-error' : undefined"
          @input="onEdit"
        />
      </FormField>

      <FormField
        label="Descrição"
        html-for="access-group-description"
        :error="serverErrors.description"
        error-id="access-group-description-error"
      >
        <textarea
          id="access-group-description"
          v-model="form.description"
          rows="3"
          :maxlength="DESCRIPTION_MAX_LENGTH"
          :disabled="submitting"
          @input="onEdit"
        />
      </FormField>

      <FormField
        label="Nível de sigilo"
        html-for="access-group-level"
        required
        :error="serverErrors.secrecyLevel"
        error-id="access-group-level-error"
      >
        <select
          id="access-group-level"
          v-model="form.secrecyLevel"
          :disabled="submitting || noLevelAvailable"
          aria-describedby="access-group-level-hint"
          @change="onEdit"
        >
          <option
            v-for="level in levelOptions"
            :key="level.value"
            :value="level.value"
            :disabled="level.taken"
          >
            {{ level.taken ? `${level.label} (já possui grupo)` : level.label }}
          </option>
        </select>
      </FormField>

      <p id="access-group-level-hint" class="group-form-hint">
        Cada área pode ter apenas um grupo por nível de sigilo.
      </p>
      <p v-if="noLevelAvailable" class="group-form-warning" role="status">
        Todos os níveis de sigilo já possuem um grupo nesta área.
      </p>
      <p v-if="serverErrors.general" class="group-form-error" role="alert">
        {{ serverErrors.general }}
      </p>
    </form>

    <template #footer>
      <Button variant="outline" :disabled="submitting" @click="emit('close')">Cancelar</Button>
      <Button type="submit" :form="FORM_ID" :loading="submitting" :disabled="noLevelAvailable">
        Criar Grupo
      </Button>
    </template>
  </AccessGroupDialogShell>
</template>

<style scoped>
.group-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group-form textarea {
  resize: vertical;
}

.group-form-hint {
  margin-top: -0.5rem;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.group-form-warning {
  color: var(--color-warning);
  font-size: 0.82rem;
}

.group-form-error {
  color: var(--color-danger);
  font-size: 0.82rem;
}
</style>
