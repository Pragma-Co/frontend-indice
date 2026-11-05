# API contract used by the frontend

Every call goes through the Vite proxy with the `/api` prefix, which is stripped before reaching
the Django backend (`VITE_API_PORT`, default 8000). Responses are JSON. Error bodies never reach
the UI as-is: `src/api/client.js` maps the HTTP status to a user-facing message and keeps the body
in `ApiError.details` for the callers that need it.

## Authentication

The backend keeps a Django session cookie; the frontend never stores the user in `localStorage`.
Every request that changes data (`POST`, `PUT`, `PATCH`, `DELETE`) sends the `X-CSRFToken` header
with the value of the `csrftoken` cookie (`src/api/client.js`).

| Endpoint | Request | Responses |
| --- | --- | --- |
| `GET /auth/csrf` | none | `204`, sets the `csrftoken` cookie |
| `POST /auth/login` | `{ "email", "password" }` | `200` user (same body as `GET /users/me`); `400` `{ "errors": { "email"?, "password"? } }` or `{ "error": "InvalidJSON" }`; `401` `{ "error": "InvalidCredentials" }` |
| `POST /auth/logout` | none | `204`, ends the session |
| `GET /users/me` | none | `200` user `{ "id", "name", "email", "role", "area": { "id", "acronym", "name" }, ... }`; `401` without a session |

Every other route requires a session and answers `401` `{ "error": "AuthenticationRequired" }`
without one. The public routes are `/auth/csrf`, `/auth/login`, `/auth/logout`,
`/legal-documents*` and `/health/`.

How the frontend uses them:

| Moment | Frontend |
| --- | --- |
| Login (`authStore.signIn`) | `GET /auth/csrf`, then `POST /auth/login`; the returned user opens the session in memory. `400` and `401` stay on the login screen with an inline message |
| First navigation (`authStore.ensureSession`) | the router guard waits for one `GET /users/me`; `200` opens the session, `401` or a network error keeps the user signed out. Simultaneous checks share the same request |
| Protected route without session | goes to `/login?redirect=<path>` (no `redirect` for `/` or `/home`); after login the user returns to that path |
| Signed in user on `/login` | goes to `/home` |
| `401` on any other request | the handler registered with `setUnauthorizedHandler` (`src/router/sessionExpiry.js`) clears the session, shows "Sua sessão expirou. Entre novamente." once and opens `/login?redirect=<current path>`. `401` from `/auth/login` is ignored |
| `403` | the request fails with "Você não tem permissão para esta ação."; the session is kept |
| Logout (`authStore.signOut`) | `POST /auth/logout`, then clears the user, the `csrftoken` cookie and the legacy `indice.profile` / `indice.user` keys, even if the request fails |

## Catalogs

| Endpoint | Response |
| --- | --- |
| `GET /projects/` | `[{ "id", "code", "name", "discipline_ids" }]`, active only, ordered by name. `discipline_ids` is derived from the project's existing documents and is informational; any discipline can be chosen |
| `GET /disciplines/` | `[{ "id", "code", "name" }]`, active only, ordered by name |

Document types and areas are static lists in `src/utils/documentCatalog.js`, mirroring the seed.

## Documents list

`GET /documents` is paginated by the server. Every parameter is optional and they combine with AND:

| Parameter | Meaning |
| --- | --- |
| `q` | free text in title, code, description and tags, case-insensitive |
| `tipo` | document type code, e.g. `DWG` |
| `area` | area acronym, e.g. `EST` |
| `data` | `last_7_days`, `last_month` or `last_year` |
| `date_from`, `date_to` | creation range, `YYYY-MM-DD`, inclusive |
| `page` | page number starting at 1 (default 1) |
| `page_size` | items per page (default 20, max 100) |

Response `200`, from the most recent to the oldest:

```json
{
  "count": 30,
  "total_pages": 2,
  "current_page": 1,
  "page_size": 20,
  "results": [
    {
      "id": 33,
      "code": "AK-2100-MAT-ESP-0004",
      "title": "Card 31 live",
      "description": "",
      "type": { "code": "ESP", "name": "Especificação Técnica" },
      "discipline": { "code": "MAT", "name": "Materiais e Processos" },
      "areas": [{ "acronym": "EST", "name": "Engenharia Estrutural" }],
      "revision": { "version": 1, "label": "REV01" },
      "status": "PENDING",
      "updated_at": "2026-09-18T21:30:04.000000+00:00"
    }
  ]
}
```

`count` is the total found with the current filters. `revision` is an object or `null`; the table
shows `revision.label` or `-`. A page past the end answers `200` with `results: []`; an invalid
parameter answers `400` with `{ "errors": { "<param>": { "code", "message" } } }`, shown to the
user as the generic load error.

Both list screens (`/documents` and `/results`) share `useDocumentList`
(`src/views/document/composables/`): `page` and `page_size` live in the URL next to the search
filters, changing the page size or the filters goes back to page 1, and a page past the end falls
back to the last valid page. `status` is the status of the latest revision and becomes a badge
(`src/utils/documentStatus.js`):

| `status` | Badge |
| --- | --- |
| `PENDING` | Em revisão |
| `APPROVED` | Vigente |
| `REJECTED` | Rejeitado |
| `OBSOLETE` | Obsoleto |

The list is always fetched fresh from the API by query string; no client-side cache is kept.


## Upload (step 1)

`POST /documents/upload`, `multipart/form-data` with the field `file`.

- `201`: `{ "temp_file_id", "original_name", "file_size", "inferred_type" }`. The frontend keeps
  `temp_file_id` as the document id of the queue item and hands it to step 3.
- `400`: unsupported type (`pdf`, `doc`, `jpeg`, `png` are accepted, sniffed by content).
- `413`: file above the size limit.

## Registration (step 3, "Publicar")

`POST /documents`, `application/json`:

```json
{
  "temp_file_id": "53cf33ae-5588-4c2e-994a-132f31cf2a9e",
  "title": "Desenho de conjunto da caverna 14",
  "description": "Conjunto soldado da caverna 14",
  "project_id": 1,
  "discipline_id": 1,
  "document_type": "DWG",
  "confidentiality": "CONFIDENTIAL",
  "responsible_id": 12,
  "areas": ["EST", "QUA"]
}
```

| Field | Required | Source in the frontend |
| --- | --- | --- |
| `temp_file_id` | yes | `uploadStore.uploadedDocuments[0].id` (set by `useDocumentUpload.js`) |
| `title` | yes, up to 255 | `form.title` |
| `description` | no, up to 500 | `form.description` |
| `project_id` | yes | `form.projectId` (numeric id from `GET /projects/`) |
| `discipline_id` | yes | `form.disciplineId` |
| `document_type` | yes | `form.documentType` (code, e.g. `DWG`) |
| `confidentiality` | yes | `form.confidentiality` (`PUBLIC`, `CONFIDENTIAL`, `SECRET`) |
| `responsible_id` | yes | `authStore.currentUser.id` (the signed in user) |
| `areas` | yes, at least one | `form.areas` (acronyms, e.g. `["EST"]`) |

The mapping lives in `toDocumentPayload` (`src/api/documents.js`); the call is `createDocument`.

Responses and how the frontend reacts (`documentFormStore.publish` + `DocumentConfirmationView`):

| Status | Body | Frontend |
| --- | --- | --- |
| `201` | `id`, `code`, `title`, `description`, `project`, `discipline`, `document_type`, `confidentiality`, `responsible`, `areas`, `revision` (`version`, `label` such as `REV01`, `status`, `issue_date`), `file` (`original_name`, `extension`, `mime_type`, `size_bytes`, `sha256`, `storage_path`), `created_at` | clears the form, shows the success notification with the code and opens `/documentos`, where the new document comes first with the status "Em revisão" |
| `400` | `{ "errors": { "<field>": "<message>" } }` (payload field names) or `{ "error": "..." }` | maps each key to the form field (`project_id` → `projectId`, `responsible_id` → `author`, ...) and returns to step 2 with the messages inline |
| `404` | `{ "errors": { "temp_file_id": "..." } }` | asks for a new upload and returns to step 1 |
| `409` | `{ "error": "...", "document": { "id", "code" } }` | shows "já está cadastrado no documento `<code>`" on step 3 |
| `500` / `503` | `{ "error": "..." }` | generic message by status, no backend details |

### Field error codes

The frontend never shows the backend `message` of a `400`: it translates `field + code` into a
Portuguese message (`src/utils/publishErrors.js`) and falls back to "Valor inválido para o campo
<label>." when the entry is a plain string or the code is unknown. The backend sends each entry as `{ "code": "<code>", "message": "<developer text>" }` with these codes:

| Payload field | Codes |
| --- | --- |
| `title` | `required`, `too_long` |
| `description` | `too_long` |
| `project_id` | `required`, `not_found` |
| `discipline_id` | `required`, `not_found` |
| `document_type` | `required`, `not_found` |
| `confidentiality` | `required`, `invalid_choice` |
| `responsible_id` | `required`, `not_found` |
| `areas` | `required`, `invalid`, `not_found` |
| `temp_file_id` | `required`, `invalid`, `not_found` (the last one as `404`) |

### Document code

Pattern `PROJECT-DISCIPLINE-TYPE-NNNN`, e.g. `AK-2100-EST-DWG-0002`; the four-digit sequence is
assigned by the backend among the documents with the same prefix. The revision is not part of the
code: it comes in `revision.label` (`REV01`). Step 2 previews `AK-2100-EST-DWG-####` until the
document is confirmed (`buildDocumentCode` in `src/utils/documentCode.js`).
