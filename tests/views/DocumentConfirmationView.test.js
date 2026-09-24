import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DocumentConfirmationView from '../../src/views/document/components/DocumentConfirmation.vue'
import { useDocumentFormStore } from '../../src/stores/documentFormStore'
import { useNotificationStore } from '../../src/stores/notificationStore'
import { useUploadStore } from '../../src/stores/uploadStore'

const push = vi.fn()
const replace = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace }) }))
vi.mock('../../src/api/projects', () => ({ listProjects: vi.fn() }))
vi.mock('../../src/api/disciplines', () => ({ listDisciplines: vi.fn() }))
vi.mock('../../src/api/documents', async (importOriginal) => ({
  ...(await importOriginal()),
  createDocument: vi.fn(),
}))

import { ApiError } from '../../src/api/client'
import { createDocument } from '../../src/api/documents'

function publishButton(wrapper) {
  return wrapper.findAll('button').find((b) => b.text().startsWith('Publicar'))
}

describe('DocumentConfirmationView', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDocumentFormStore()
    vi.clearAllMocks()
    store.projects = [{ id: 1, code: 'AK-2100', name: 'Aeroestrutura de Fuselagem Central' }]
    store.disciplines = [{ id: 1, code: 'EST', name: 'Estruturas' }]
    store.documentTypes = [{ id: 'DWG', code: 'DWG', name: 'Desenho' }]
    Object.assign(store.form, {
      title: 'Desenho da fuselagem central',
      projectId: 1,
      disciplineId: 1,
      documentType: 'DWG',
      author: 'João Silva',
      areas: ['EST'],
    })
  })

  it('should send the user back to the metadata step when required fields are missing', () => {
    store.form.title = ''

    mount(DocumentConfirmationView)

    expect(replace).toHaveBeenCalledWith({ name: 'document-metadata' })
  })

  it('should stay on the confirmation step when the form is complete', () => {
    mount(DocumentConfirmationView)

    expect(replace).not.toHaveBeenCalled()
  })

  it('should show Confirmação as the current step with the previous steps done', () => {
    const wrapper = mount(DocumentConfirmationView)

    expect(wrapper.find('.step-circle.active').text()).toBe('3')
    expect(wrapper.findAll('.step-circle.done')).toHaveLength(2)
    expect(wrapper.text()).toContain('Resumo do Documento')
  })

  it('should summarise the metadata kept in the store', () => {
    store.form.title = 'Desenho da fuselagem central'
    store.form.projectId = 1
    store.form.disciplineId = 1
    store.form.documentType = 'DWG'

    const wrapper = mount(DocumentConfirmationView)

    expect(wrapper.find('[data-testid="document-code"]').text()).toBe('AK-2100-EST-DWG-####')
  })

  it('should go back to the metadata step keeping the form', async () => {
    store.form.title = 'Mantido'
    const wrapper = mount(DocumentConfirmationView)

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Anterior')
      .trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'document-metadata' })
    expect(store.form.title).toBe('Mantido')
  })

  describe('publish', () => {
    let uploadStore

    beforeEach(() => {
      uploadStore = useUploadStore()
      uploadStore.setUploadedDocuments([{ id: 'temp-1', name: 'desenho.pdf', size: 10 }])
    })

    it('should publish with the uploaded temp file, notify and open the documents list on 201', async () => {
      createDocument.mockResolvedValue({ id: 7, code: 'AK-2100-EST-DWG-0002', title: 'Desenho' })
      const wrapper = mount(DocumentConfirmationView)

      await publishButton(wrapper).trigger('click')
      await flushPromises()

      expect(createDocument).toHaveBeenCalledWith(
        expect.objectContaining({ temp_file_id: 'temp-1', responsible_id: 12 }),
      )
      expect(push).toHaveBeenCalledWith({ name: 'document-list' })
      expect(useNotificationStore().items[0]).toMatchObject({
        type: 'success',
        message: 'Documento AK-2100-EST-DWG-0002 publicado com sucesso.',
      })
      expect(uploadStore.uploadedDocuments).toEqual([])
    })

    it('should stay on the step and show the existing document on 409', async () => {
      createDocument.mockRejectedValue(
        new ApiError('Já existe.', {
          status: 409,
          details: { document: { id: 3, code: 'AK-2100-EST-DWG-0001' } },
        }),
      )
      const wrapper = mount(DocumentConfirmationView)

      await publishButton(wrapper).trigger('click')
      await flushPromises()

      expect(push).not.toHaveBeenCalled()
      expect(wrapper.find('[role="alert"]').text()).toContain('AK-2100-EST-DWG-0001')
      expect(useNotificationStore().items[0]).toMatchObject({
        type: 'error',
        message: 'Este arquivo já está cadastrado no documento AK-2100-EST-DWG-0001.',
      })
      expect(uploadStore.uploadedDocuments).toHaveLength(1)
    })

    it('should send the user back to the upload step on 404', async () => {
      createDocument.mockRejectedValue(
        new ApiError('Não encontrado.', {
          status: 404,
          details: { errors: { temp_file_id: 'expired' } },
        }),
      )
      const wrapper = mount(DocumentConfirmationView)

      await publishButton(wrapper).trigger('click')
      await flushPromises()

      expect(push).toHaveBeenCalledWith({ name: 'document-upload' })
      expect(uploadStore.uploadedDocuments).toEqual([])
      expect(store.publishError).toBe('O arquivo enviado expirou. Faça o upload novamente.')
      expect(useNotificationStore().items[0].type).toBe('error')
    })

    it('should send the user back to the metadata step on 400', async () => {
      createDocument.mockRejectedValue(
        new ApiError('Dados inválidos.', {
          status: 400,
          details: { errors: { title: 'Title is required.' } },
        }),
      )
      const wrapper = mount(DocumentConfirmationView)

      await publishButton(wrapper).trigger('click')
      await flushPromises()

      expect(push).toHaveBeenCalledWith({ name: 'document-metadata' })
      expect(store.serverErrors).toEqual({ title: 'Valor inválido para o campo Título.' })
    })
  })
})
