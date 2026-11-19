import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  workerOptions: {},
}))

vi.mock('pdfjs-dist', () => ({
  getDocument: mocks.getDocument,
  GlobalWorkerOptions: mocks.workerOptions,
  TextLayer: class {
    constructor({ textContentSource, container }) {
      this.container = container
      this.textContentItemsStr = textContentSource.items
        .filter((item) => typeof item.str === 'string')
        .map((item) => item.str)
      this.textDivs = []
    }

    async render() {
      this.textDivs = this.textContentItemsStr.map((text) => {
        const textDiv = document.createElement('span')
        textDiv.textContent = text
        this.container.appendChild(textDiv)
        return textDiv
      })
    }
  },
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/worker.mjs' }))

import ProtectedPdf from '@/components/common/ProtectedPdf.vue'

describe('ProtectedPdf', () => {
  let page
  let destroy

  beforeEach(() => {
    page = {
      getViewport: vi.fn(({ scale }) => ({
        width: 600 * scale,
        height: 800 * scale,
        transform: [scale, 0, 0, -scale, 0, 800 * scale],
      })),
      getTextContent: vi.fn().mockResolvedValue({
        items: [
          {
            str: 'Termo para buscar',
            transform: [1, 0, 0, 10, 20, 30],
            width: 100,
            height: 10,
          },
        ],
      }),
      render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
      cleanup: vi.fn(),
    }
    destroy = vi.fn().mockResolvedValue(undefined)
    mocks.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage: vi.fn().mockResolvedValue(page) }),
      destroy,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders every page as a canvas and cleans up when unmounted', async () => {
    const wrapper = mount(ProtectedPdf, { props: { url: '/api/files/1/view' } })
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/files/1/view',
      expect.objectContaining({ credentials: 'include', signal: expect.any(AbortSignal) }),
    )
    expect(mocks.workerOptions.workerSrc).toBe('/worker.mjs')
    expect(wrapper.findAll('canvas')).toHaveLength(2)
    expect(wrapper.findAll('canvas')[1].attributes('aria-label')).toBe('Página 2 de 2')
    expect(page.render).toHaveBeenCalledTimes(2)
    wrapper.unmount()
    expect(destroy).toHaveBeenCalled()
  })

  it('shows an explicit error when the PDF request fails', async () => {
    fetch.mockResolvedValue({ ok: false, status: 403 })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(ProtectedPdf, { props: { url: '/api/files/1/view' } })
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Não foi possível carregar')
    expect(log).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('searches PDF text, highlights matches, and navigates between results', async () => {
    const wrapper = mount(ProtectedPdf, {
      props: { url: '/api/files/1/view' },
      attachTo: document.body,
    })
    await flushPromises()

    await wrapper.find('input[type="search"]').setValue('termo')
    expect(wrapper.find('.protected-pdf-page').element.style.position).toBe('relative')
    expect(wrapper.find('canvas').element.style.width).toBe('100%')
    expect(wrapper.find('.protected-pdf-search-status').text()).toBe('1 de 2')
    expect(wrapper.findAll('.protected-pdf-search-highlight')).toHaveLength(2)
    expect(wrapper.find('.protected-pdf-search-highlight.is-active').exists()).toBe(true)

    await wrapper.find('[aria-label="Próximo resultado"]').trigger('click')
    expect(wrapper.find('.protected-pdf-search-status').text()).toBe('2 de 2')
    expect(wrapper.findAll('.protected-pdf-search-highlight.is-active')).toHaveLength(1)

    const shortcut = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(shortcut)
    expect(shortcut.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(wrapper.find('input[type="search"]').element)
    wrapper.unmount()
  })

  it('does not render a previous file after the URL changes', async () => {
    let resolveFirst
    fetch.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    const wrapper = mount(ProtectedPdf, { props: { url: '/first' } })
    await flushPromises()
    await wrapper.setProps({ url: '/second' })
    await flushPromises()
    resolveFirst({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
    await flushPromises()

    expect(wrapper.findAll('canvas')).toHaveLength(2)
    expect(mocks.getDocument).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
