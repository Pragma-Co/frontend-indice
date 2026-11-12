const FORM_FIELD_BY_PAYLOAD_KEY = {
  temp_file_id: 'tempFileId',
  temp_file_ids: 'tempFileId',
  title: 'title',
  description: 'description',
  project_id: 'projectId',
  discipline_id: 'disciplineId',
  document_type: 'documentType',
  confidentiality: 'confidentiality',
  responsible_id: 'author',
  areas: 'areas',
  authorized_area_codes: 'authorizedAreas',
  authorized_group_ids: 'authorizedAreas',
  authorized_user_ids: 'authorizedUsers',
}

const FIELD_LABELS = {
  tempFileId: 'Arquivo enviado',
  title: 'Título',
  description: 'Descrição',
  projectId: 'Projeto',
  disciplineId: 'Disciplina',
  documentType: 'Tipo de documento',
  confidentiality: 'Grau de confidencialidade',
  author: 'Responsável/Autor',
  areas: 'Área(s) relacionada(s)',
  authorizedAreas: 'Áreas com acesso',
  authorizedUsers: 'Usuários com acesso',
}

export const FIELD_ERROR_MESSAGES = {
  tempFileId: {
    required: 'Nenhum arquivo foi enviado. Faça o upload novamente.',
    invalid: 'O arquivo enviado é inválido. Faça o upload novamente.',
    not_found: 'O arquivo enviado expirou. Faça o upload novamente.',
  },
  title: {
    required: 'Título é obrigatório.',
    too_long: 'Título deve ter no máximo 255 caracteres.',
  },
  description: {
    too_long: 'Descrição deve ter no máximo 500 caracteres.',
  },
  projectId: {
    required: 'Projeto é obrigatório.',
    not_found: 'Projeto não encontrado ou inativo.',
  },
  disciplineId: {
    required: 'Disciplina é obrigatória.',
    not_found: 'Disciplina não encontrada ou inativa.',
  },
  documentType: {
    required: 'Tipo de documento é obrigatório.',
    not_found: 'Tipo de documento não encontrado ou inativo.',
  },
  confidentiality: {
    required: 'Grau de confidencialidade é obrigatório.',
    invalid_choice: 'Grau de confidencialidade inválido.',
  },
  author: {
    required: 'Responsável é obrigatório.',
    not_found: 'Responsável não encontrado ou inativo.',
  },
  areas: {
    required: 'Selecione ao menos uma área.',
    invalid: 'Informe as áreas como uma lista de siglas.',
    not_found: 'Uma ou mais áreas não existem ou estão inativas.',
  },
  authorizedAreas: {
    invalid: 'Informe as áreas como uma lista de siglas.',
    not_found: 'Uma ou mais áreas não existem ou estão inativas.',
    not_allowed: 'Áreas com acesso só são aceitas em documentos confidenciais.',
    insufficient_level: 'Um grupo selecionado tem nível de sigilo inferior ao do documento.',
  },
  authorizedUsers: {
    required: 'Selecione ao menos um usuário com acesso.',
    invalid: 'Informe os usuários como uma lista de identificadores.',
    not_found: 'Um ou mais usuários não existem ou estão inativos.',
    not_allowed: 'Usuários com acesso só são aceitos em documentos sigilosos.',
  },
}

export function translateFieldError(field, entry) {
  const code = entry && typeof entry === 'object' ? entry.code : undefined
  const known = FIELD_ERROR_MESSAGES[field]?.[code]
  if (known) return known
  const label = FIELD_LABELS[field] ?? field
  return `Valor inválido para o campo ${label}.`
}

export function mapServerErrors(errors) {
  return Object.fromEntries(
    Object.entries(errors ?? {}).map(([key, entry]) => {
      const field = FORM_FIELD_BY_PAYLOAD_KEY[key] ?? key
      return [field, translateFieldError(field, entry)]
    }),
  )
}

export function publishErrorMessage(error) {
  const status = error?.status
  const details = error?.details
  if (status === 400) return 'Alguns campos precisam de correção. Revise os metadados.'
  if (status === 404) return FIELD_ERROR_MESSAGES.tempFileId.not_found
  if (status === 409) {
    const code = details?.document?.code
    return code
      ? `Este arquivo já está cadastrado no documento ${code}.`
      : 'Este arquivo já está cadastrado em outro documento.'
  }
  return error?.message || 'Não foi possível publicar o documento. Tente novamente.'
}
