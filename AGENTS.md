# AGENTS.md — Instruções para agentes de IA

> Este arquivo é a **fonte única de verdade** para instruções de IA neste repositório.
> Ferramentas específicas (GitHub Copilot, Claude Code, Cursor, Aider, etc.) devem
> referenciar este arquivo em vez de duplicar seu conteúdo.
>
> Leia este documento **por completo** antes de gerar, modificar ou revisar qualquer código.

---

# Estrutura de projeto — Frontend Vue 3

Este documento descreve a estrutura recomendada para o frontend em Vue 3, com foco em manutenção, clareza para desenvolvedores e facilidade de interpretação por inteligências artificiais.

## 1) Visão geral

O Vue 3 com Vite é excelente para projetos pequenos e médios que precisam de velocidade de desenvolvimento, organização simples e boa manutenção. A melhor prática neste tipo de projeto é separar a aplicação em camadas bem definidas:

- `src/main.js`: bootstrap da aplicação
- `src/App.vue`: componente raiz
- `src/router/`: rotas da aplicação
- `src/stores/`: estado global (Pinia)
- `src/components/`: componentes reutilizáveis
- `src/views/`: páginas da aplicação
- `src/api/`: integração com backend
- `src/composables/`: lógica reutilizável em composição
- `src/utils/`: funções auxiliares
- `src/assets/`: imagens, ícones e arquivos estáticos

Para projetos pequenos, a estrutura enxuta é a mais adequada e suficiente.

---

## 2) Estrutura recomendada para este projeto

```text
frontend-api-6/
├── .env
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── PROJECT_STRUCTURE.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── src/
│   ├── App.vue
│   ├── main.js
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── api/
│   │   ├── client.js
│   │   └── auth.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.vue
│   │   │   └── Card.vue
│   │   └── layout/
│   │       ├── Navbar.vue
│   │       └── Sidebar.vue
│   ├── composables/
│   │   ├── useAuth.js
│   │   └── useFetch.js
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   └── authStore.js
│   ├── styles/
│   │   ├── globals.css
│   │   └── variables.css
│   ├── utils/
│   │   ├── formatters.js
│   │   └── validators.js
│   └── views/
│       ├── home
│       │     ├── HomeView.vue
│       │     ├── composables/
│       │     │       └── useFilters.js
│       │     └── components/
│       │             └── Filters.vue
│       ├── LoginView.vue
│       └── DashboardView.vue
└── node_modules/
```

### Significado das partes principais

- `index.html`: página base do Vite
- `vite.config.js`: configuração do servidor e build
- `package.json`: dependências e scripts do projeto
- `src/main.js`: ponto de entrada da aplicação Vue
- `src/App.vue`: componente raiz da interface
- `src/components/`: blocos reutilizáveis da interface
- `src/views/`: páginas principais da aplicação
- `src/router/`: configuração de rotas
- `src/stores/`: estado compartilhado
- `src/api/`: comunicação com a API do backend
- `src/composables/`: lógica reutilizável por composição
- `src/utils/`: helpers e funções auxiliares
- `src/assets/`: ícones, imagens e arquivos estáticos
- `.env`: configurações locais do ambiente, como a porta do backend

---

## 3) Convenções de nomenclatura

Para manter o frontend consistente e amigável tanto para humanos quanto para IA, siga estas regras:

- use `PascalCase` para componentes Vue, ex.: `UserCard.vue`, `Navbar.vue`
- use `camelCase` para funções, composables e utilitários, ex.: `useAuth`, `formatDate`
- use `kebab-case` para nomes de arquivos e pastas quando fizer sentido, ex.: `user-profile/`, `auth-service.js`
- prefira nomes claros e específicos, como `LoginView.vue` em vez de `Tela.vue`
- evite misturar responsabilidades em um único arquivo muito grande
- organize arquivos por contexto funcional, e não apenas por tipo

---

## 4) Organização por responsabilidade

### `src/components/`

Componentes reutilizáveis e genéricos da interface.

Exemplos:

- `Button.vue`
- `Modal.vue`
- `Card.vue`
- `InputField.vue`

### `src/views/`

Páginas principais da aplicação.

Exemplos:

- `HomeView.vue`
- `DashboardView.vue`
- `LoginView.vue`

### `src/router/`

Arquivo de roteamento da aplicação.

- `index.js`: configuração principal das rotas

### `src/stores/`

Estado compartilhado global, ideal com Pinia.

Exemplos:

- `authStore.js`
- `userStore.js`
- `uiStore.js`

### `src/composables/`

Lógica reutilizável em composição, geralmente extraída de componentes.

Exemplos:

- `useAuth.js`
- `useApi.js`
- `useLocalStorage.js`

### `src/api/`

Camada de comunicação com o backend.

Exemplos:

- `client.js`: cliente HTTP central
- `auth.js`: endpoints de autenticação
- `users.js`: endpoints de usuários

### `src/utils/`

Funções genéricas que não pertencem a outra camada.

Exemplos:

- `formatters.js`
- `validators.js`
- `dateHelpers.js`

### `src/assets/`

Imagens, ícones, fontes e recursos estáticos.

---

## 5) Política de comentários no código

**Não gere comentários no código.** Esta é uma regra rígida.

- ❌ Não adicione comentários explicativos em linhas de código
- ❌ Não adicione comentários de seção (ex.: `// ===== Imports =====`)
- ❌ Não adicione JSDoc, TSDoc ou docstrings
- ❌ Não adicione comentários "TODO", "FIXME" ou "NOTE" sem solicitação explícita
- ❌ Não adicione cabeçalhos de arquivo com autor, data ou descrição
- ✅ Código deve ser autoexplicativo por meio de nomes claros
- ✅ Se precisar explicar algo, use nomes descritivos em vez de comentários
- ✅ A única exceção é quando o desenvolvedor pedir explicitamente um comentário

### Exceções técnicas permitidas

Comentários que são **instruções para ferramentas** (não explicações para humanos) são permitidos e obrigatórios quando necessários:

- `/* @vite-ignore */`
- `// @ts-ignore` e `// @ts-expect-error`
- `// eslint-disable-next-line` e variantes
- Diretivas de build e plugins

Esses não contam como "comentários" para efeito desta regra.

### Escopo

Essa regra se aplica a **todo** código gerado: componentes Vue, composables, stores, funções utilitárias, configurações e scripts.

---

## 6) Boas práticas para manter o projeto legível

- manter uma única responsabilidade por arquivo
- separar lógica de UI, regra de negócio e integração com API
- nomear arquivos de forma previsível e fácil de encontrar
- usar pastas por contexto funcional
- evitar `src/` com dezenas de arquivos soltos sem classificação

---

## 7) Diretriz final

Para o frontend Vue 3, a estrutura ideal para este projeto é manter a organização simples e modular, com as camadas separadas em `components`, `views`, `router`, `stores`, `api`, `composables`, `utils` e `assets`.

Essa estrutura é suficiente para manter o projeto fácil de ler, fácil de evoluir e claro tanto para desenvolvedores quanto para inteligências artificiais.

Sempre que gerar código para este projeto, siga todas as regras acima — em especial a **Política de comentários no código** (seção 5).
