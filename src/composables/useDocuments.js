import { computed, ref } from 'vue'

// TODO: replace with a real GET /documents/ call once the listing endpoint exists.
const MOCK_DOCUMENTS = [
  {
    id: 'doc-1',
    code: 'PJT001-EST-DWG-0025',
    title: 'Planta de Fundação – Bloco A',
    type: 'Desenho',
    revision: 'REV02',
    status: 'vigente',
    updatedAt: '2025-06-02T14:30:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-2',
    code: 'PJT001-MEM-CAL-0012',
    title: 'Memória de Cálculo – Estrutural',
    type: 'Memória de cálculo',
    revision: 'REV01',
    status: 'em_revisao',
    updatedAt: '2025-05-30T09:15:00',
    updatedBy: 'você',
    action: 'view-revision',
  },
  {
    id: 'doc-3',
    code: 'PJT002-REL-0007',
    title: 'Relatório de Cargas',
    type: 'Relatório',
    revision: 'REV03',
    status: 'vigente',
    updatedAt: '2025-05-28T16:45:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-4',
    code: 'PJT001-NOR-0045',
    title: 'Especificação de Materiais',
    type: 'Norma / Especificação',
    revision: 'REV01',
    status: 'vigente',
    updatedAt: '2025-05-27T11:20:00',
    updatedBy: 'você',
    action: 'continue-editing',
  },
  {
    id: 'doc-5',
    code: 'PJT003-DOC-0120',
    title: 'Manual do Fornecedor X',
    type: 'Documento de fornecedor',
    revision: 'REV02',
    status: 'vigente',
    updatedAt: '2025-05-20T10:10:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-6',
    code: 'PJT002-EST-DWG-0031',
    title: 'Planta de Cobertura – Bloco B',
    type: 'Desenho',
    revision: 'REV01',
    status: 'rascunho',
    updatedAt: '2025-05-18T08:40:00',
    updatedBy: 'você',
    action: 'continue-editing',
  },
  {
    id: 'doc-7',
    code: 'PJT001-MEM-CAL-0013',
    title: 'Memória de Cálculo – Fundações',
    type: 'Memória de cálculo',
    revision: 'REV02',
    status: 'vigente',
    updatedAt: '2025-05-15T13:05:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-8',
    code: 'PJT004-REL-0002',
    title: 'Relatório de Ensaios de Solo',
    type: 'Relatório',
    revision: 'REV01',
    status: 'vigente',
    updatedAt: '2025-05-12T09:50:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-9',
    code: 'PJT002-NOR-0019',
    title: 'Especificação de Acabamentos',
    type: 'Norma / Especificação',
    revision: 'REV01',
    status: 'em_revisao',
    updatedAt: '2025-05-10T17:25:00',
    updatedBy: 'você',
    action: 'view-revision',
  },
  {
    id: 'doc-10',
    code: 'PJT003-DOC-0121',
    title: 'Manual do Fornecedor Y',
    type: 'Documento de fornecedor',
    revision: 'REV01',
    status: 'vigente',
    updatedAt: '2025-05-08T10:00:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-11',
    code: 'PJT001-EST-DWG-0026',
    title: 'Planta de Fôrmas – Bloco A',
    type: 'Desenho',
    revision: 'REV03',
    status: 'vigente',
    updatedAt: '2025-05-05T15:35:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-12',
    code: 'PJT002-MEM-CAL-0008',
    title: 'Memória de Cálculo – Contenções',
    type: 'Memória de cálculo',
    revision: 'REV01',
    status: 'rascunho',
    updatedAt: '2025-05-02T09:00:00',
    updatedBy: 'você',
    action: 'continue-editing',
  },
  {
    id: 'doc-13',
    code: 'PJT001-REL-0014',
    title: 'Relatório de Inspeção Estrutural',
    type: 'Relatório',
    revision: 'REV02',
    status: 'vigente',
    updatedAt: '2025-04-29T14:15:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-14',
    code: 'PJT003-NOR-0007',
    title: 'Especificação de Instalações Elétricas',
    type: 'Norma / Especificação',
    revision: 'REV01',
    status: 'vigente',
    updatedAt: '2025-04-25T11:40:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-15',
    code: 'PJT004-DOC-0033',
    title: 'Manual do Fornecedor Z',
    type: 'Documento de fornecedor',
    revision: 'REV02',
    status: 'em_revisao',
    updatedAt: '2025-04-22T16:05:00',
    updatedBy: 'você',
    action: 'view-revision',
  },
  {
    id: 'doc-16',
    code: 'PJT002-EST-DWG-0032',
    title: 'Planta de Instalações Hidráulicas',
    type: 'Desenho',
    revision: 'REV01',
    status: 'vigente',
    updatedAt: '2025-04-18T10:20:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-17',
    code: 'PJT001-MEM-CAL-0014',
    title: 'Memória de Cálculo – Vigas',
    type: 'Memória de cálculo',
    revision: 'REV02',
    status: 'vigente',
    updatedAt: '2025-04-14T08:55:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
  {
    id: 'doc-18',
    code: 'PJT003-REL-0011',
    title: 'Relatório de Não Conformidades',
    type: 'Relatório',
    revision: 'REV01',
    status: 'vigente',
    updatedAt: '2025-04-10T13:30:00',
    updatedBy: 'você',
    action: 'new-revision',
  },
]

export const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50]
const DEFAULT_ITEMS_PER_PAGE = 20

export function useDocuments() {
  const currentPage = ref(1)
  const itemsPerPage = ref(DEFAULT_ITEMS_PER_PAGE)

  const documents = computed(() =>
    [...MOCK_DOCUMENTS].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
  )

  const totalPages = computed(() => Math.max(1, Math.ceil(documents.value.length / itemsPerPage.value)))

  const paginatedDocuments = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    return documents.value.slice(start, start + itemsPerPage.value)
  })

  function goToPage(page) {
    currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  }

  function setItemsPerPage(value) {
    itemsPerPage.value = value
    currentPage.value = 1
  }

  return {
    documents,
    paginatedDocuments,
    currentPage,
    itemsPerPage,
    totalPages,
    goToPage,
    setItemsPerPage,
  }
}
