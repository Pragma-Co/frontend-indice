import { describe, expect, it } from 'vitest'
import router from '../../src/router'

describe('router', () => {
  it('should resolve the home route to the home view', async () => {
    await router.push('/home')
    expect(router.currentRoute.value.name).toBe('home')
    expect(document.title).toBe('Colaborador - Início')
  })

  it('should send the root path to the home route', async () => {
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('should resolve the documents route to the list view', async () => {
    await router.push('/documents')
    expect(router.currentRoute.value.name).toBe('document-list')
  })

  it('should resolve the new revision route of a document', async () => {
    await router.push('/documents/23/new-revision')

    expect(router.currentRoute.value.name).toBe('document-new-revision')
    expect(router.currentRoute.value.params.documentId).toBe('23')
    expect(document.title).toBe('Colaborador - Nova revisão')
  })

  it('should keep every document route under /documents so the navbar marks the Documentos tab', () => {
    const names = ['document-list', 'document-upload', 'document-metadata', 'document-confirmation']

    const paths = names.map((name) => router.resolve({ name }).path)

    expect(paths).toEqual([
      '/documents',
      '/documents/upload',
      '/documents/metadata',
      '/documents/confirmation',
    ])
  })
})
