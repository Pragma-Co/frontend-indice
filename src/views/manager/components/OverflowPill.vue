<script setup>
import { ref } from 'vue'

defineProps({
  text: { type: String, required: true },
})

const truncated = ref(false)

function detectTruncation(event) {
  const pill = event.currentTarget
  truncated.value = pill.scrollWidth > pill.clientWidth
}
</script>

<template>
  <span
    class="pill"
    :title="truncated ? text : undefined"
    @mouseenter="detectTruncation"
    @focus="detectTruncation"
  >
    {{ text }}
  </span>
</template>

<style scoped src="./panelTable.css"></style>
