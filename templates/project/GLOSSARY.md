# n8n workflows

The workflows of this project, kept as files and delivered to n8n instances with Boilerlift.

## Language

### n8n

**Workflow**:
A set of nodes and the connections between them, that n8n runs from a trigger.

**Node**:
One step of a workflow: a trigger, an action on a service, or a transformation of the items.

**Trigger**:
The node that starts a workflow: a manual click, a schedule, a webhook or an event of a service.

**Connection**:
The link from one node's output to the next node's input. The items flow along it.

**Item**:
One unit of data passed between nodes, as `{ json: {...} }`. A node receives a list of items and returns a list of items.

**Code node**:
A node that runs JavaScript on its input items. In this project its JavaScript is a tested function in `code/`.

**Credential**:
A secret stored in n8n, such as an API key or an OAuth token, that a node uses to reach a service. A workflow names it; the secret stays in n8n.

**Execution**:
One run of a workflow on n8n.

### Boilerlift

**Target**:
One n8n instance this project delivers to: its URL, its API key and its workflows folder, named in `boilerlift.config.ts`.

**Workflow file**:
One workflow kept in the project, as a `<name>.workflow.ts` or `<name>.json` file.

**Stable name**:
The name of a workflow file without its extension. It identifies the workflow across deploys, whatever its title in n8n.

**Lock file**:
`boilerlift.lock.json`, the link between each stable name and its n8n id.

**Draft**:
The version of a workflow that `lift deploy` delivers. It is not live until it is published.

**Publish**:
Make the deployed drafts live on n8n.

**Clean**:
Archive on n8n the workflows removed from the project.
