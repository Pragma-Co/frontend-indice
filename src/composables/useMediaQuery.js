import { onBeforeUnmount, ref } from 'vue'

export function useMediaQuery(query) {
  const supportsMatchMedia =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  const mediaQueryList = supportsMatchMedia ? window.matchMedia(query) : null
  const matches = ref(Boolean(mediaQueryList?.matches))

  function update(event) {
    matches.value = event.matches
  }

  mediaQueryList?.addEventListener('change', update)

  onBeforeUnmount(() => {
    mediaQueryList?.removeEventListener('change', update)
  })

  return matches
}
