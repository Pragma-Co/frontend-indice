import { describe, expect, it } from 'vitest'
import router from '../../src/router'

describe('router', () => {
  it('should send the home route to the upload step until the home screen exists', async () => {
    // When
    await router.push('/home')
    // Then
    expect(router.currentRoute.value.path).toBe('/documentos/upload')
  })

  it('should send the documents route to the upload step until the list view exists', async () => {
    // When
    await router.push('/documentos')
    // Then
    expect(router.currentRoute.value.path).toBe('/documentos/upload')
  })
})
