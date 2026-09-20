import { describe, expect, it } from 'vitest'
import router from '../../src/router'

describe('router', () => {
  it('should resolve the home route to the home view', async () => {
    // When
    await router.push('/home')
    // Then
    expect(router.currentRoute.value.name).toBe('home')
    expect(document.title).toBe('Colaborador - Início')
  })

  it('should send the root path to the home route', async () => {
    // When
    await router.push('/')
    // Then
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('should resolve the documents route to the list view', async () => {
    // When
    await router.push('/documents')
    // Then
    expect(router.currentRoute.value.name).toBe('document-list')
  })

  it('should keep every document route under /documentos so the navbar marks the Documentos tab', () => {
    const names = ['document-list', 'document-upload', 'document-metadata', 'document-confirmation']

    const paths = names.map((name) => router.resolve({ name }).path)

    expect(paths).toEqual([
      '/documentos',
      '/documentos/upload',
      '/documentos/metadados',
      '/documentos/confirmacao',
    ])
  })
})
