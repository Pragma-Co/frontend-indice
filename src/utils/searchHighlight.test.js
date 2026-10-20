import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractSearchTerms,
  highlightSegments,
  resultSnippet,
  segmentsFromMarkedText,
  segmentsFromTerms,
} from './searchHighlight.js'

test('extracts unique words from the search query', () => {
  assert.deepEqual(extractSearchTerms(' planta, baixa planta-ENG '), ['planta', 'baixa', 'ENG'])
})

test('returns no terms for an empty query', () => {
  assert.deepEqual(extractSearchTerms(''), [])
})

test('turns marked text from the backend into segments', () => {
  assert.deepEqual(segmentsFromMarkedText('Projeto <mark>elétrico</mark> &amp; hidráulico'), [
    { text: 'Projeto ', match: false },
    { text: 'elétrico', match: true },
    { text: ' & hidráulico', match: false },
  ])
})

test('keeps escaped html as plain text', () => {
  assert.deepEqual(segmentsFromMarkedText('&lt;script&gt; <mark>teste</mark>'), [
    { text: '<script> ', match: false },
    { text: 'teste', match: true },
  ])
})

test('highlights terms ignoring case and accents', () => {
  assert.deepEqual(segmentsFromTerms('Memorial Elétrico da obra', ['eletrico']), [
    { text: 'Memorial ', match: false },
    { text: 'Elétrico', match: true },
    { text: ' da obra', match: false },
  ])
})

test('merges overlapping matches of different terms', () => {
  assert.deepEqual(segmentsFromTerms('Subestação', ['sub', 'bestacao']), [
    { text: 'Subestação', match: true },
  ])
})

test('returns the whole text when there are no terms', () => {
  assert.deepEqual(segmentsFromTerms('Sem destaque', []), [{ text: 'Sem destaque', match: false }])
})

test('prefers the backend highlight and falls back to the terms', () => {
  assert.deepEqual(highlightSegments('<mark>Planta</mark> baixa', 'Planta baixa', ['baixa']), [
    { text: 'Planta', match: true },
    { text: ' baixa', match: false },
  ])
  assert.deepEqual(highlightSegments('Planta baixa', 'Planta baixa', ['baixa']), [
    { text: 'Planta ', match: false },
    { text: 'baixa', match: true },
  ])
})

test('builds the snippet from content fragments when they match', () => {
  const snippet = resultSnippet({
    description: 'Descrição',
    highlights: { content: ['trecho <mark>um</mark>', 'trecho <mark>dois</mark>'] },
  })
  assert.equal(snippet.marked, '… trecho <mark>um</mark> … trecho <mark>dois</mark> …')
  assert.equal(snippet.fromContent, true)
})

test('builds the snippet from the description when the content does not match', () => {
  const snippet = resultSnippet({
    description: 'Memorial de cálculo',
    highlights: { description: '<mark>Memorial</mark> de cálculo', content: [] },
  })
  assert.deepEqual(snippet, {
    marked: '<mark>Memorial</mark> de cálculo',
    plain: 'Memorial de cálculo',
    fromContent: false,
  })
})
