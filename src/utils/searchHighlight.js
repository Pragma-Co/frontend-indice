const MARK_PATTERN = /<mark>([\s\S]*?)<\/mark>/g
const TERM_PATTERN = /[\p{L}\p{N}]+/gu
const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
}
const SNIPPET_ELLIPSIS = '…'

function decodeEntities(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (entity) => HTML_ENTITIES[entity])
}

function foldCharacter(character) {
  const folded = character.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  return folded.length === 1 ? folded : character.toLowerCase().charAt(0) || character
}

function foldText(text) {
  return text.split('').map(foldCharacter).join('')
}

function hasMarks(text) {
  return typeof text === 'string' && text.includes('<mark>')
}

export function extractSearchTerms(query = '') {
  return [...new Set(String(query ?? '').match(TERM_PATTERN) ?? [])]
}

export function segmentsFromMarkedText(markedText = '') {
  const segments = []
  let cursor = 0
  for (const match of markedText.matchAll(MARK_PATTERN)) {
    if (match.index > cursor) {
      segments.push({ text: decodeEntities(markedText.slice(cursor, match.index)), match: false })
    }
    segments.push({ text: decodeEntities(match[1]), match: true })
    cursor = match.index + match[0].length
  }
  if (cursor < markedText.length) {
    segments.push({ text: decodeEntities(markedText.slice(cursor)), match: false })
  }
  return segments
}

export function segmentsFromTerms(text = '', terms = []) {
  const source = String(text ?? '')
  if (!source) return []

  const foldedTerms = [...new Set(terms.map((term) => foldText(String(term))))].filter(Boolean)
  if (!foldedTerms.length) return [{ text: source, match: false }]

  const foldedSource = foldText(source)
  const matched = new Array(source.length).fill(false)
  for (const term of foldedTerms) {
    let index = foldedSource.indexOf(term)
    while (index !== -1) {
      matched.fill(true, index, index + term.length)
      index = foldedSource.indexOf(term, index + term.length)
    }
  }

  const segments = []
  for (let index = 0; index < source.length; index += 1) {
    const last = segments.at(-1)
    if (last && last.match === matched[index]) {
      last.text += source[index]
    } else {
      segments.push({ text: source[index], match: matched[index] })
    }
  }
  return segments
}

export function highlightSegments(markedText, plainText, terms = []) {
  if (hasMarks(markedText)) return segmentsFromMarkedText(markedText)
  return segmentsFromTerms(plainText, terms)
}

export function resultSnippet(document = {}) {
  const fragments = (document.highlights?.content ?? []).filter(hasMarks)
  if (fragments.length) {
    return {
      marked: `${SNIPPET_ELLIPSIS} ${fragments.join(` ${SNIPPET_ELLIPSIS} `)} ${SNIPPET_ELLIPSIS}`,
      plain: '',
      fromContent: true,
    }
  }
  return {
    marked: document.highlights?.description ?? '',
    plain: document.description ?? '',
    fromContent: false,
  }
}
