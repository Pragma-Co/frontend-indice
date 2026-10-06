<script setup>
import { computed } from 'vue'
import { Lock } from '@lucide/vue'
import Badge from '@/components/common/Badge.vue'
import { findConfidentiality } from '@/utils/documentCatalog.js'

const props = defineProps({
  document: { type: Object, required: true },
})

const confidentiality = computed(() => findConfidentiality(props.document.confidentiality_level))

const context = computed(() =>
  [
    props.document.project?.code && `Programa ${props.document.project.code}`,
    props.document.discipline?.code &&
      `${props.document.discipline.code} - ${props.document.discipline.name}`,
  ]
    .filter(Boolean)
    .join(' • '),
)
</script>

<template>
  <section class="card document-header" aria-label="Documento em revisão">
    <div class="document-identifier">
      <Lock :size="14" aria-hidden="true" />
      <span class="document-code">{{ document.code }}</span>
      <Badge v-if="confidentiality" :variant="confidentiality.value.toLowerCase()">
        {{ confidentiality.label }}
      </Badge>
    </div>
    <h2 class="document-title">{{ document.title }}</h2>
    <p v-if="context" class="document-context">{{ context }}</p>
  </section>
</template>

<style scoped>
.document-header {
  padding: 1rem 1.25rem;
}

.document-identifier {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
}

.document-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}

.document-title {
  font-size: 1.05rem;
  margin-top: 0.5rem;
}

.document-context {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}
</style>
