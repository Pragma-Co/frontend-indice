import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  workerOptions: {},
}))

vi.mock('pdfjs-dist', () => ({
  getDocument: mocks.getDocument,
  GlobalWorkerOptions: mocks.workerOptions,
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/worker.mjs' }))

import ProtectedPdf from '@/components/common/ProtectedPdf.vue'

describe('ProtectedPdf', () => {
  let page
  let destroy

  beforeEach(() => {
    page = {
      getViewport: vi.fn(({ scale }) => ({ width: 600 * scale, height: 800 * scale })),
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
