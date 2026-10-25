<script setup>
const props = defineProps({
  tabs: { type: Array, required: true },
  activeTab: { type: String, required: true },
})

const emit = defineEmits(['select'])

function labelFor(tab) {
  return tab.count === null || tab.count === undefined ? tab.label : `${tab.label} (${tab.count})`
}

function focusSibling(event, offset) {
  const index = props.tabs.findIndex((tab) => tab.id === props.activeTab)
  const next = props.tabs[(index + offset + props.tabs.length) % props.tabs.length]
  emit('select', next.id)
  event.currentTarget.parentElement.querySelector(`#panel-tab-${next.id}`)?.focus()
}
</script>

<template>
  <div class="panel-tabs" role="tablist" aria-label="Seções do painel de revisões">
    <button
      v-for="tab in tabs"
      :id="`panel-tab-${tab.id}`"
      :key="tab.id"
      type="button"
      role="tab"
      class="panel-tab"
      :class="{ active: tab.id === activeTab }"
      :aria-selected="tab.id === activeTab"
      :aria-controls="`panel-tabpanel-${tab.id}`"
      :tabindex="tab.id === activeTab ? 0 : -1"
      @click="emit('select', tab.id)"
      @keydown.right.prevent="focusSibling($event, 1)"
      @keydown.left.prevent="focusSibling($event, -1)"
    >
      {{ labelFor(tab) }}
    </button>
  </div>
</template>

<style scoped>
.panel-tabs {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  margin-top: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.panel-tab {
  padding: 0.85rem 1rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.panel-tab:hover {
  color: var(--color-text);
}

.panel-tab.active {
  color: var(--color-primary);
  font-weight: 600;
  border-bottom-color: var(--color-primary);
}

.panel-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
</style>
