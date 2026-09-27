import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDocumentQueryKey, buildDocumentSearchQuery } from './searchParams.js'

test('keeps only non-empty document search parameters', () => {
  assert.deepEqual(
    buildDocumentSearchQuery({ query: ' planta ', date: '', area: 'ENG', type: 'PDF' }),
    { q: 'planta', area: 'ENG', tipo: 'PDF' },
  )
})

test('returns no parameters for an empty search', () => {
  assert.deepEqual(buildDocumentSearchQuery(), {})
})

test('builds the same key regardless of query parameter order', () => {
  assert.equal(
    buildDocumentQueryKey({ area: 'ENG', q: 'planta' }),
    buildDocumentQueryKey({ q: 'planta', area: 'ENG' }),
  )
})

test('ignores empty parameters in the request key', () => {
  assert.equal(buildDocumentQueryKey({ q: '', area: 'ENG' }), 'area=ENG')
})
