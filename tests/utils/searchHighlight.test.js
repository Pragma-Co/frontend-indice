import { describe, expect, it } from 'vitest'
import {
  extractSearchTerms,
  highlightSegments,
  resultSnippet,
  segmentsFromMarkedText,
  segmentsFromTerms,
} from '@/utils/searchHighlight.js'

describe('searchHighlight', () => {
  it('extracts unique words from the search query', () => {
    expect(extractSearchTerms(' planta, baixa planta-ENG ')).toEqual(['planta', 'baixa', 'ENG'])
  })

  it('returns no terms for an empty query', () => {
    expect(extractSearchTerms('')).toEqual([])
  })

  it('turns marked text from the backend into segments', () => {
    expect(segmentsFromMarkedText('Projeto <mark>elétrico</mark> &amp; hidráulico')).toEqual([
      { text: 'Projeto ', match: false },
      { text: 'elétrico', match: true },
      { text: ' & hidráulico', match: false },
    ])
  })

  it('keeps escaped html as plain text', () => {
    expect(segmentsFromMarkedText('&lt;script&gt; <mark>teste</mark>')).toEqual([
      { text: '<script> ', match: false },
      { text: 'teste', match: true },
    ])
  })

  it('highlights terms ignoring case and accents', () => {
    expect(segmentsFromTerms('Memorial Elétrico da obra', ['eletrico'])).toEqual([
      { text: 'Memorial ', match: false },
      { text: 'Elétrico', match: true },
      { text: ' da obra', match: false },
    ])
  })

  it('merges overlapping matches of different terms', () => {
    expect(segmentsFromTerms('Subestação', ['sub', 'bestacao'])).toEqual([
      { text: 'Subestação', match: true },
    ])
  })

  it('returns the whole text when there are no terms', () => {
    expect(segmentsFromTerms('Sem destaque', [])).toEqual([{ text: 'Sem destaque', match: false }])
  })

  it('prefers the backend highlight and falls back to the terms', () => {
    expect(highlightSegments('<mark>Planta</mark> baixa', 'Planta baixa', ['baixa'])).toEqual([
      { text: 'Planta', match: true },
      { text: ' baixa', match: false },
    ])
    expect(highlightSegments('Planta baixa', 'Planta baixa', ['baixa'])).toEqual([
      { text: 'Planta ', match: false },
      { text: 'baixa', match: true },
    ])
  })

  it('builds the snippet from content fragments when they match', () => {
    const snippet = resultSnippet({
      description: 'Descrição',
      highlights: { content: ['trecho <mark>um</mark>', 'trecho <mark>dois</mark>'] },
    })
    expect(snippet.marked).toBe('… trecho <mark>um</mark> … trecho <mark>dois</mark> …')
    expect(snippet.fromContent).toBe(true)
  })

  it('builds the snippet from the description when the content does not match', () => {
    const snippet = resultSnippet({
      description: 'Memorial de cálculo',
      highlights: { description: '<mark>Memorial</mark> de cálculo', content: [] },
    })
    expect(snippet).toEqual({
      marked: '<mark>Memorial</mark> de cálculo',
      plain: 'Memorial de cálculo',
      fromContent: false,
    })
  })
})
