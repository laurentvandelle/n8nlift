# n8nlift

n8nlift is a command-line tool that keeps n8n workflows as typed files in Git and tests them like any other code.
It deploys them to the user's own n8n instance as drafts, and the published version keeps running until the user publishes.

## Terms

- **Instance**: the user's own n8n server, reached through `N8N_URL` and its public API with `N8N_API_KEY`. n8nlift never hosts one.
- **Workflow file**: one workflow under `./workflows`: a `.workflow.ts` file whose default export is an n8n export passed to `defineWorkflow`, or a `.json` n8n export. Its base name is its stable name.
- **Stable name**: the identity of a workflow across runs and instances: the file base name without `.workflow.ts` / `.json`, 1 to 16 of `a-z`, `0-9` and `-`. On the instance it is the tag `n8nlift:<stable-name>`.
- **Draft**: the latest saved version of a workflow on the instance. `deploy` writes only drafts.
- **Published**: the version of a workflow that runs on its triggers. It changes only when the user publishes.
- **Deploy**: delivering every local workflow to the instance: create the new ones, update the changed ones as drafts, skip the unchanged ones.
