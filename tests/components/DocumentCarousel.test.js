import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouterLinkStub, mount } from '@vue/test-utils'
import DocumentCarousel from '../../src/views/document/components/DocumentCarousel.vue'

function makeDocument(id) {
  return {
    id,
    code: `AK-2100-EST-MEM-000${id}`,
    title: `Documento ${id}`,
    type: 'Memorial de Cálculo',
    discipline: 'Estruturas',
    revision: 'REV01',
    status: 'APPROVED',
    reasons: ['Mesmo projeto', 'Mesma disciplina', '#fadiga', 'Área EST'],
  }
}

const DOCUMENTS = [1, 2, 3, 4, 5].map(makeDocument)
const mounted = []

function setScroll(element, { scrollLeft = 0, scrollWidth = 1200, clientWidth = 600 } = {}) {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth })
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth })
  element.scrollLeft = scrollLeft
}

function mountCarousel(documents = DOCUMENTS) {
  const wrapper = mount(DocumentCarousel, {
    props: { documents, label: 'Documentos recomendados: Temas relacionados' },
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  mounted.push(wrapper)
  return wrapper
}

function track(wrapper) {
  return wrapper.find('.carousel-track')
}

function backButton(wrapper) {
  return wrapper.find('button[aria-label="Ver documentos anteriores"]')
}

function forwardButton(wrapper) {
  return wrapper.find('button[aria-label="Ver próximos documentos"]')
}

describe('DocumentCarousel', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('should render one card per document as a link to its details', () => {
    const wrapper = mountCarousel()

    const links = wrapper.findAllComponents(RouterLinkStub)

    expect(track(wrapper).attributes('aria-label')).toBe(
      'Documentos recomendados: Temas relacionados',
    )
    expect(links).toHaveLength(5)
    expect(links[0].props('to')).toEqual({ name: 'document-details', params: { documentId: 1 } })
    expect(links[0].text()).toContain('Documento 1')
    expect(links[0].text()).toContain('Memorial de Cálculo · Estruturas')
  })

  it('should show up to three reasons of the recommendation and count the rest', () => {
    const wrapper = mountCarousel()

    const chips = wrapper.findAll('.carousel-item')[0].findAll('.reason-chip')

    expect(chips.map((chip) => chip.text())).toEqual([
      'Mesmo projeto',
      'Mesma disciplina',
      '#fadiga',
      '+1',
    ])
  })

  it('should start with nothing to go back to', async () => {
    const wrapper = mountCarousel()
    setScroll(track(wrapper).element)

    await track(wrapper).trigger('scroll')

    expect(backButton(wrapper).attributes('disabled')).toBeDefined()
    expect(forwardButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should scroll forward and back by almost a full view', async () => {
    const wrapper = mountCarousel()
    const element = track(wrapper).element
    setScroll(element)
    element.scrollBy = vi.fn()
    await track(wrapper).trigger('scroll')

    await forwardButton(wrapper).trigger('click')
    setScroll(element, { scrollLeft: 540 })
    await track(wrapper).trigger('scroll')
    await backButton(wrapper).trigger('click')

    expect(element.scrollBy.mock.calls).toEqual([
      [{ left: 540, behavior: 'smooth' }],
      [{ left: -540, behavior: 'smooth' }],
    ])
  })

  it('should disable the forward button at the end of the list', async () => {
    const wrapper = mountCarousel()
    setScroll(track(wrapper).element, { scrollLeft: 600 })

    await track(wrapper).trigger('scroll')

    expect(forwardButton(wrapper).attributes('disabled')).toBeDefined()
    expect(backButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('should disable both buttons when every card fits', async () => {
    const wrapper = mountCarousel(DOCUMENTS.slice(0, 2))
    setScroll(track(wrapper).element, { scrollWidth: 600, clientWidth: 600 })

    await track(wrapper).trigger('scroll')

    expect(backButton(wrapper).attributes('disabled')).toBeDefined()
    expect(forwardButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('should scroll with the arrow keys when the list has the focus', async () => {
    const wrapper = mountCarousel()
    const element = track(wrapper).element
    setScroll(element)
    element.scrollBy = vi.fn()

    await track(wrapper).trigger('keydown', { key: 'ArrowRight' })
    await track(wrapper).trigger('keydown', { key: 'ArrowLeft' })

    expect(element.scrollBy.mock.calls.map(([options]) => options.left)).toEqual([540, -540])
  })

  it('should go back to the first card when the documents change', async () => {
    const wrapper = mountCarousel()
    const element = track(wrapper).element
    setScroll(element, { scrollLeft: 600 })

    await wrapper.setProps({ documents: DOCUMENTS.slice(0, 3) })
    await wrapper.vm.$nextTick()

    expect(element.scrollLeft).toBe(0)
    expect(wrapper.findAll('.carousel-item')).toHaveLength(3)
  })
})
