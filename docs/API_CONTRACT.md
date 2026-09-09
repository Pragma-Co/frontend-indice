# Contrato de API — Formulário de metadados (SCRUM-11 / US2)

Contrato consumido pela etapa **Metadados** do fluxo "Fazer upload de arquivo". Implementado no
backend (`backend-api-6`) na branch `feature/11-metadata-form-interface-and-ingested-files-rendering`.
Todas as chamadas partem do navegador com o prefixo `/api` (proxy do Vite), que é removido antes
de chegar ao Django.

## Endpoints

### `GET /projects/`

Popula o select **Projeto Associado**. Somente registros ativos, ordenados por `name`.

```json
[
  { "id": 1, "code": "PJT001", "name": "Projeto Alfa" }
]
```

### `GET /disciplines/`

Popula o select **Disciplina**. Somente registros ativos, ordenados por `name`. `acronym` sempre
vem preenchido pelo backend (três primeiras letras do nome, maiúsculas, sem acento:
`"Tubulação"` → `"TUB"`) e é usado diretamente na prévia do código.

```json
[
  { "id": 5, "acronym": "TUB", "name": "Tubulação" }
]
```

### Erros

- Outros métodos HTTP respondem `405`.
- Erros inesperados respondem `500` com `{ "error": "<ExceptionName>" }`.
- O frontend exibe apenas mensagens genéricas por status HTTP e nunca mostra hosts, stack traces
  ou strings internas do backend.

## Dados do formulário

Estado mantido em `src/stores/documentFormStore.js` para que as etapas de Upload e Confirmação
(tasks separadas) usem o que foi preenchido sem perder progresso. Identificadores em inglês;
rótulos exibidos ao usuário em português.

| Campo | Obrigatório | Observações |
|-------|-------------|-------------|
| `title` | sim | máx. 200 caracteres |
| `projectId` | sim | `id` de `GET /projects/` |
| `disciplineId` | sim | `id` de `GET /disciplines/` |
| `documentType` | sim | acrônimo de 3 letras (`NOR`, `DES`, `REL`, `MEM`, `REV`, `PRO`, `ESP`) |
| `description` | não | máx. 1000 caracteres |
| `author` | sim | pré-preenchido com o usuário logado, editável |
| `areas` | sim | lista com pelo menos uma área; um documento pode ter várias |
| `confidentiality` | sim | `public` (padrão), `internal`, `confidential`, `secret` |
| `revision` | — | somente leitura, iniciada em `REV01` |

## Regra do código único

Padrão: **`PROJETO-SUBGRUPO-TIPO-REV`**

| Parte | Origem | Exemplo |
|-------|--------|---------|
| `PROJETO` | `project.code` | `PJT001` |
| `SUBGRUPO` | `discipline.acronym` (3 primeiras letras, maiúsculas, sem acento) | `TUB` |
| `TIPO` | acrônimo do tipo de documento (3 primeiras letras) | `REV` |
| `REV` | revisão, iniciada em `REV01` | `REV01` |

Resultado: `PJT001-TUB-REV-REV01`.

- O acrônimo é sempre formado pelas três primeiras letras do nome, ignorando acentos e espaços
  (`Memória de Cálculo` → `MEM`, `Revisão Técnica` → `REV`). Para disciplinas ele vem do backend;
  no frontend a função `toAcronym` só é usada na lista fixa de tipos de documento.
- O frontend exibe uma **prévia somente leitura** com essa regra (`src/utils/documentCode.js`);
  o valor definitivo é gerado pelo backend na submissão (etapa de Confirmação), que é a fonte
  de verdade e deve garantir unicidade.
- **Decisão do time (2026-09-09):** o código tem **quatro partes**. O exemplo `PJT001-EST-REV01`
  que aparece nos cards está desatualizado; o correto é `PJT001-EST-REV-REV01`.

## Listas fixas no frontend

Até existirem endpoints próprios, **tipo de documento**, **áreas** e **grau de confidencialidade**
são listas estáticas em `src/utils/documentCatalog.js`. Projetos e disciplinas vêm da API.

## Upload (etapa 1) — divergência conhecida

A etapa de upload (`src/api/documents.js`, PR #3) chama `POST /documents/` e lê `id` da resposta.
O endpoint de upload do backend (PR #2 do backend) é `POST /documents/upload` e devolve
`temp_file_id`. Enquanto o backend dessa tela não for concluído, o ambiente local usa um alias
temporário `POST /documents/` que devolve `id` junto de `temp_file_id`.

**Pendência para quem fizer o backend da etapa de upload:** alinhar os dois lados
(rota `/documents/upload` e campo `temp_file_id`) e remover o alias, porque `POST /documents/`
é reservado ao endpoint de confirmação da etapa 3.
