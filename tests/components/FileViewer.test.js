import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('docx-preview', () => ({ renderAsync: vi.fn().mockResolvedValue(undefined) }))

import { renderAsync } from 'docx-preview'
import FileViewer from '../../src/components/common/FileViewer.vue'

const PDF = { id: 58, original_name: 'Memorial.PDF', mime_type: 'application/pdf' }
const IMAGE = { id: 59, original_name: 'detalhe.png', mime_type: 'image/png' }
const DOCX = { id: 61, original_name: 'relatorio.docx', mime_type: 'application/octet-stream' }
const ARCHIVE = { id: 62, original_name: 'modelo.zip', mime_type: 'application/zip' }

function mountViewer(file, url = file ? `/api/files/${file.id}/view?user_id=10` : null) {
  return mount(FileViewer, {
    props: { file, url },
    slots: { toolbar: '<span class="toolbar-info">Arquivo 1 de 1</span>' },
  })
}

function control(wrapper, label) {
  return wrapper.find(`button[aria-label="${label}"]`)
}

function fitButton(wrapper) {
  return wrapper.findAll('button').find((button) => button.text() === 'Ajustar')
}

describe('FileViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['docx']) }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should embed a pdf fitted to the width of the viewer', () => {
    const wrapper = mountViewer(PDF)

    const frame = wrapper.find('iframe')

    expect(frame.attributes('src')).toBe(
      '/api/files/58/view?user_id=10#toolbar=0&navpanes=0&zoom=page-width',
    )
    expect(frame.attributes('title')).toBe('Visualização de Memorial.PDF')
    expect(wrapper.find('.viewer-zoom-label').text()).toBe('Ajustado')
  })

  it('should show what the parent places on the toolbar', () => {
    const wrapper = mountViewer(PDF)

    expect(wrapper.find('.toolbar-info').text()).toBe('Arquivo 1 de 1')
  })

  it('should zoom the pdf in and out through the controls', async () => {
    const wrapper = mountViewer(PDF)

    await control(wrapper, 'Aumentar zoom').trigger('click')
    const zoomedIn = wrapper.find('iframe').attributes('src')
    await control(wrapper, 'Diminuir zoom').trigger('click')
    await control(wrapper, 'Diminuir zoom').trigger('click')

    expect(zoomedIn).toContain('zoom=125')
    expect(wrapper.find('iframe').attributes('src')).toContain('zoom=75')
    expect(wrapper.find('.viewer-zoom-label').text()).toBe('75%')
  })

  it('should stop at the smallest and at the largest zoom', async () => {
    const wrapper = mountViewer(PDF)

    for (let step = 0; step < 6; step += 1) {
      await control(wrapper, 'Aumentar zoom').trigger('click')
    }
    const atMaximum = {
      label: wrapper.find('.viewer-zoom-label').text(),
      disabled: control(wrapper, 'Aumentar zoom').attributes('disabled'),
    }
    for (let step = 0; step < 8; step += 1) {
      await control(wrapper, 'Diminuir zoom').trigger('click')
    }

    expect(atMaximum).toEqual({ label: '200%', disabled: '' })
    expect(wrapper.find('.viewer-zoom-label').text()).toBe('50%')
    expect(control(wrapper, 'Diminuir zoom').attributes('disabled')).toBeDefined()
  })

  it('should fit the file again on Ajustar', async () => {
    const wrapper = mountViewer(PDF)
    const disabledWhileFitted = fitButton(wrapper).attributes('disabled')
    await control(wrapper, 'Aumentar zoom').trigger('click')

    await fitButton(wrapper).trigger('click')

    expect(disabledWhileFitted).toBeDefined()
    expect(wrapper.find('iframe').attributes('src')).toContain('zoom=page-width')
  })

  it('should scale an image with the zoom', async () => {
    const wrapper = mountViewer(IMAGE)
    const fitted = wrapper.find('img').classes()

    await control(wrapper, 'Aumentar zoom').trigger('click')

    const image = wrapper.find('img')
    expect(fitted).toContain('viewer-image-fit')
    expect(image.attributes('src')).toBe('/api/files/59/view?user_id=10')
    expect(image.attributes('alt')).toBe('detalhe.png')
    expect(image.attributes('style')).toContain('width: 125%')
    expect(image.classes()).not.toContain('viewer-image-fit')
  })

  it('should render a docx file with the embedded renderer', async () => {
    const wrapper = mountViewer(DOCX)
    await flushPromises()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/files/61/view?user_id=10', {
      credentials: 'include',
    })
    expect(renderAsync).toHaveBeenCalledTimes(1)
    expect(renderAsync.mock.calls[0][1]).toBe(wrapper.find('.viewer-docx-pages').element)
  })

  it('should explain when the docx file cannot be loaded', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false, status: 403 })

    const wrapper = mountViewer(DOCX)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Não foi possível carregar o arquivo.')
    expect(renderAsync).not.toHaveBeenCalled()
  })

  it('should say when the format cannot be previewed and disable the zoom', () => {
    const wrapper = mountViewer(ARCHIVE)

    expect(wrapper.text()).toContain('Formato não suportado para visualização.')
    expect(wrapper.text()).toContain('modelo.zip')
    expect(control(wrapper, 'Aumentar zoom').attributes('disabled')).toBeDefined()
    expect(control(wrapper, 'Diminuir zoom').attributes('disabled')).toBeDefined()
  })

  it('should say when there is no file to show', () => {
    const wrapper = mountViewer(null)

    expect(wrapper.text()).toContain('Nenhum arquivo disponível para esta revisão.')
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('should fit the next file again when the file changes', async () => {
    const wrapper = mountViewer(PDF)
    await control(wrapper, 'Aumentar zoom').trigger('click')

    await wrapper.setProps({ file: IMAGE, url: '/api/files/59/view?user_id=10' })

    expect(wrapper.find('.viewer-zoom-label').text()).toBe('Ajustado')
    expect(wrapper.find('img').classes()).toContain('viewer-image-fit')
  })
})
