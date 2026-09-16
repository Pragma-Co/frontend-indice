# API contract used by the frontend

Every call goes through the Vite proxy with the `/api` prefix, which is stripped before reaching
the Django backend (`VITE_API_PORT`, default 8000). Responses are JSON. Error bodies never reach
the UI as-is: `src/api/client.js` maps the HTTP status to a user-facing message and keeps the body
in `ApiError.details` for the callers that need it.

## Catalogs

| Endpoint | Response |
| --- | --- |
| `GET /projects/` | `[{ "id", "code", "name" }]`, active only, ordered by name |
| `GET /disciplines/` | `[{ "id", "code", "name" }]`, active only, ordered by name |

Document types and areas are static lists in `src/utils/documentCatalog.js`, mirroring the seed.

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
| `responsible_id` | yes | `authStore.currentUser.id` (seeded user until authentication exists) |
| `areas` | yes, at least one | `form.areas` (acronyms, e.g. `["EST"]`) |

The mapping lives in `toDocumentPayload` (`src/api/documents.js`); the call is `createDocument`.

Responses and how the frontend reacts (`documentFormStore.publish` + `DocumentConfirmationView`):

| Status | Body | Frontend |
| --- | --- | --- |
| `201` | `id`, `code`, `title`, `description`, `project`, `discipline`, `document_type`, `confidentiality`, `responsible`, `areas`, `revision` (`version`, `label` such as `REV01`, `status`, `issue_date`), `file` (`original_name`, `extension`, `mime_type`, `size_bytes`, `sha256`, `storage_path`), `created_at` | stores `id`, `code`, `title` and `revision.label`, clears the form and opens `/documentos/publicado` |
| `400` | `{ "errors": { "<field>": "<message>" } }` (payload field names) or `{ "error": "..." }` | maps each key to the form field (`project_id` → `projectId`, `responsible_id` → `author`, ...) and returns to step 2 with the messages inline |
| `404` | `{ "errors": { "temp_file_id": "..." } }` | asks for a new upload and returns to step 1 |
| `409` | `{ "error": "...", "document": { "id", "code" } }` | shows "já está cadastrado no documento `<code>`" on step 3 |
| `500` / `503` | `{ "error": "..." }` | generic message by status, no backend details |

### Document code

Pattern `PROJECT-DISCIPLINE-TYPE-NNNN`, e.g. `AK-2100-EST-DWG-0002`; the four-digit sequence is
assigned by the backend among the documents with the same prefix. The revision is not part of the
code: it comes in `revision.label` (`REV01`). Step 2 previews `AK-2100-EST-DWG-####` until the
document is confirmed (`buildDocumentCode` in `src/utils/documentCode.js`).
