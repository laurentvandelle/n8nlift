# Identify workflows by an `n8nlift:` tag and always update them as drafts

`deploy` must find, on the user's instance, the workflow that a local file already created, without breaking what runs in production. Each workflow carries the tag `n8nlift:<stable-name>`, where the stable name is the file base name. Updates always go through `PUT /api/v1/workflows/{id}?publishIfActive=false`, so they land as a draft and the published version keeps running (n8n 2.35.0 or later). A workflow is skipped when its local nodes, connections, settings and name equal the instance's current draft, compared live on every run.

## Considered options

- A local state file mapping stable names to workflow ids: breaks when the file is lost, not committed, or shared between environments, and drifts when someone edits the instance.
- A marker in the workflow description: the user can edit it in the editor, and n8n has no filter on it.
- A content hash stored locally or on the instance: one more record to keep in sync; a live comparison with the current draft needs none.

## Consequences

- n8n caps tag names at 24 characters, so a stable name is at most 16 characters (`^[a-z0-9-]{1,16}$`).
- Two instance workflows with the same `n8nlift:` tag stop deploy before any change. Tags added by hand are kept.
- Every run reads each matched workflow (`GET /api/v1/workflows/{id}`); there is no local cache.
