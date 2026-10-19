<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { EllipsisVertical } from '@lucide/vue'

const props = defineProps({
  items: { type: Array, required: true },
  label: { type: String, default: 'Mais ações' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const open = ref(false)
const trigger = ref(null)
const menu = ref(null)
const position = ref({})

function menuItems() {
  return [...(menu.value?.querySelectorAll('[role="menuitem"]') ?? [])]
}

function focusItem(index) {
  const items = menuItems()
  if (!items.length) return
  items[(index + items.length) % items.length].focus()
}

function place() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  position.value = {
    top: `${rect.bottom + 4}px`,
    right: `${Math.max(window.innerWidth - rect.right, 8)}px`,
  }
}

function onOutsideClick(event) {
  if (trigger.value?.contains(event.target) || menu.value?.contains(event.target)) return
  close(false)
}

function listen() {
  document.addEventListener('mousedown', onOutsideClick)
  window.addEventListener('resize', closeQuietly)
  window.addEventListener('scroll', closeQuietly, true)
}

function unlisten() {
  document.removeEventListener('mousedown', onOutsideClick)
  window.removeEventListener('resize', closeQuietly)
  window.removeEventListener('scroll', closeQuietly, true)
}

async function openMenu() {
  if (props.disabled || open.value) return
  place()
  open.value = true
  listen()
  await nextTick()
  focusItem(0)
}

function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  unlisten()
  if (returnFocus) trigger.value?.focus()
}

function closeQuietly() {
  close(false)
}

function toggle() {
  if (open.value) close()
  else openMenu()
}

function select(item) {
  close()
  emit('select', item.id)
}

function moveFocus(offset) {
  const items = menuItems()
  const current = items.indexOf(document.activeElement)
  focusItem(current + offset)
}

onBeforeUnmount(unlisten)
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="action-menu-trigger"
    aria-haspopup="menu"
    :aria-expanded="open"
    :aria-label="label"
    :disabled="disabled"
    @click="toggle"
    @keydown.down.prevent="openMenu"
  >
    <EllipsisVertical :size="18" aria-hidden="true" />
  </button>
  <Teleport to="body">
    <ul
      v-if="open"
      ref="menu"
      class="action-menu"
      role="menu"
      :aria-label="label"
      :style="position"
      @keydown.esc.prevent="close()"
      @keydown.tab="close(false)"
      @keydown.down.prevent="moveFocus(1)"
      @keydown.up.prevent="moveFocus(-1)"
    >
      <li v-for="item in items" :key="item.id" role="none">
        <button
          type="button"
          role="menuitem"
          class="action-menu-item"
          :class="{ danger: item.danger }"
          @click="select(item)"
        >
          {{ item.label }}
        </button>
      </li>
    </ul>
  </Teleport>
</template>

<style scoped>
.action-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.action-menu-trigger:hover:not(:disabled),
.action-menu-trigger[aria-expanded='true'] {
  border-color: var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.action-menu-trigger:disabled {
  cursor: default;
  opacity: 0.5;
}

.action-menu-trigger:focus-visible,
.action-menu-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.action-menu {
  position: fixed;
  z-index: 150;
  min-width: 11rem;
  margin: 0;
  padding: 0.3rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
  list-style: none;
}

.action-menu-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
}

.action-menu-item:hover,
.action-menu-item:focus-visible {
  background: var(--color-surface-muted);
}

.action-menu-item.danger {
  color: var(--color-danger);
}
</style>
