export const COLLABORATOR_ACCOUNT = {
  id: 12,
  name: 'Beatriz Canuto',
  email: 'beatriz.canuto@akaer.local',
  role: 'AUTHOR',
  area: { id: 3, acronym: 'CER', name: 'Certificação e Aeronavegabilidade' },
  terms_accepted_at: '2026-10-01T12:00:00Z',
  is_active: true,
  created_at: '2026-09-01T12:00:00Z',
  deletion_requested_at: null,
}

export const MANAGER_ACCOUNT = {
  id: 10,
  name: 'Thiago Serpa',
  email: 'thiago.serpa@akaer.local',
  role: 'AUDITOR',
  area: { id: 5, acronym: 'QUA', name: 'Qualidade e Inspeção' },
  terms_accepted_at: '2026-10-01T12:00:00Z',
  is_active: true,
  created_at: '2026-09-01T12:00:00Z',
  deletion_requested_at: null,
}

export const ACCOUNTS_BY_PROFILE = {
  collaborator: COLLABORATOR_ACCOUNT,
  manager: MANAGER_ACCOUNT,
}
