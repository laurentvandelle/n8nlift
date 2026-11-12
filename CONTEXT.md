# n8nlift

n8nlift is a command-line tool that builds n8n workflows from typed TypeScript code and tests them like any other code.
It deploys them to the user's own n8n instance as drafts, and the published version keeps running until the user publishes.

## Terms

- **Instance**: the user's own n8n server, reached through `N8N_URL` and its public API with `N8N_API_KEY`. n8nlift never hosts one.
