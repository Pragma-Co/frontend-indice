# Contrato de API — Formulário de metadados (SCRUM-11 / US2)

Contrato consumido pela etapa **Metadados** do fluxo "Fazer upload de arquivo". O backend
(`backend-api-6`) deve expor estes endpoints com estes formatos. Todas as chamadas partem do
navegador com o prefixo `/api` (proxy do Vite), que é removido antes de chegar ao Django.

## Endpoints

### `GET /projetos/`

Popula o select **Projeto Associado**.

```json
[
  { "id": 1, "codigo": "PJT001", "nome": "Projeto Alfa" }
]
```

### `GET /disciplinas/`

Popula o select **Disciplina**. `sigla` é opcional: se ausente, o frontend deriva das três
primeiras letras do nome (`"Tubulação"` → `"TUB"`).

```json
[
  { "id": 2, "sigla": "TUB", "nome": "Tubulação" }
]
```

Erros: o frontend exibe apenas mensagens genéricas por status HTTP e nunca mostra hosts,
stack traces ou strings internas do backend.

## Dados do formulário

Estado mantido em `src/stores/documentFormStore.js` para que as etapas de Upload e Confirmação
(tasks separadas) usem o que foi preenchido sem perder progresso.

| Campo | Obrigatório | Observações |
|-------|-------------|-------------|
| `titulo` | sim | máx. 200 caracteres |
| `projetoId` | sim | id de `GET /projetos/` |
| `disciplinaId` | sim | id de `GET /disciplinas/` |
| `tipoDocumento` | sim | sigla de 3 letras (`NOR`, `DES`, `REL`, `MEM`, `REV`, `PRO`, `ESP`) |
| `descricao` | não | máx. 1000 caracteres |
| `responsavel` | não | pré-preenchido com o usuário logado, editável |
| `areas` | sim | lista com pelo menos uma área; um documento pode ter várias |
| `confidencialidade` | não | `publico` (padrão), `interno`, `confidencial`, `sigiloso` |
| `revisao` | — | somente leitura, iniciada em `REV01` |

## Regra do código único

Padrão: **`PROJETO-SUBGRUPO-TIPO-REV`**

| Parte | Origem | Exemplo |
|-------|--------|---------|
| `PROJETO` | `projeto.codigo` | `PJT001` |
| `SUBGRUPO` | sigla da disciplina (3 primeiras letras, maiúsculas, sem acento) | `TUB` |
| `TIPO` | sigla do tipo de documento (3 primeiras letras) | `REV` |
| `REV` | revisão, iniciada em `REV01` | `REV01` |

Resultado: `PJT001-TUB-REV-REV01`.

- A sigla é sempre formada pelas três primeiras letras do nome, ignorando acentos e espaços
  (`Memória de Cálculo` → `MEM`, `Revisão Técnica` → `REV`).
- O frontend exibe uma **prévia somente leitura** com essa regra (`src/utils/documentCode.js`);
  o valor definitivo é gerado pelo backend na submissão (etapa de Confirmação), que é a fonte
  de verdade e deve garantir unicidade.
- **Ponto a confirmar com o cliente:** o exemplo do card (`PJT001-EST-REV01`) tem três partes,
  enquanto o padrão descrito tem quatro. O frontend segue o padrão de quatro partes; se a
  decisão for três partes, basta ajustar `buildDocumentCode`.

## Listas fixas no frontend

Até existirem endpoints próprios, **tipo de documento**, **áreas** e **grau de confidencialidade**
são listas estáticas em `src/utils/documentCatalog.js`. Projetos e disciplinas vêm da API.
