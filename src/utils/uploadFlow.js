/**
 * Shared definition of the "Fazer upload de arquivo" flow: page texts and the
 * three steps rendered by StepIndicator. Every step view imports from here.
 */
export const UPLOAD_FLOW_TITLE = 'Fazer upload de arquivo'
export const UPLOAD_FLOW_SUBTITLE = 'Faça o carregamento de seus arquivos e siga as orientações para avançar.'

export const UPLOAD_STEP = 1
export const METADATA_STEP = 2
export const CONFIRMATION_STEP = 3

export const UPLOAD_STEPS = [
  { title: 'Upload', subtitle: 'Arquivos do projeto' },
  { title: 'Metadados', subtitle: 'Definição de atributos' },
  { title: 'Confirmação', subtitle: 'Revisão e envio final' },
]
