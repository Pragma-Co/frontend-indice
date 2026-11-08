<script setup>
defineProps({
  user: { type: Object, required: true },
})

const watermarks = Array.from({ length: 12 }, (_, index) => {
  const column = index % 3
  const row = Math.floor(index / 3)
  const x =
    column === 0 ? Math.random() * 6 : column === 2 ? -Math.random() * 6 : Math.random() * 12 - 6
  const y =
    row === 0 ? Math.random() * 15 : row === 3 ? -Math.random() * 15 : Math.random() * 30 - 15
  return { x, y }
})

function blockShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x'].includes(event.key.toLowerCase())) {
    event.preventDefault()
  }
}
</script>

<template>
  <div
    class="protected-content"
    @copy.prevent
    @cut.prevent
    @selectstart.prevent
    @dragstart.prevent
    @contextmenu.prevent
    @keydown="blockShortcut"
  >
    <slot />
    <div class="protected-watermark" aria-hidden="true">
      <span
        v-for="(mark, index) in watermarks"
        :key="index"
        :style="{ transform: `translate(${mark.x}%, ${mark.y}%) rotate(-15deg)` }"
      >
        {{ user.name }} · {{ user.email }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.protected-content {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  -webkit-user-select: none;
  user-select: none;
}

.protected-content :deep(*) {
  -webkit-user-select: none;
  user-select: none;
}

.protected-watermark {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  align-items: center;
  justify-items: center;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.protected-watermark span {
  width: 90%;
  color: rgba(100, 25, 25, 0.4);
  font-size: clamp(0.65rem, 1vw, 0.9rem);
  font-weight: 700;
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
