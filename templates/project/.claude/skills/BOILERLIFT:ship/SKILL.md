---
name: "BOILERLIFT:ship"
description: "Takes one n8n workflow request from idea to a deployed draft, in this session: interviews the user until shared understanding, shows the decision summary, and on one Build go-ahead writes the defineWorkflow file and its Code node functions, runs npm run verify and lift deploy --dry-run until both pass, deploys the workflow as a draft, and gives the QA scenarios to run in n8n. Publishes only on a separate yes. Use when the user invokes /BOILERLIFT:ship <what the workflow should do>, or asks to create, build or change an n8n workflow in this project."
disable-model-invocation: true
---

Take one workflow request from interview to a draft on n8n that the user tests. Everything happens in this session and in this folder: no git, no branch, no pull request.

The user does three things: answer the interview, say **Build**, and run the QA in n8n. Publishing is a fourth, separate decision.

Rules that hold for the whole run:

- **Read `AGENTS.md` first.** It holds the commands, which of them need the user's go-ahead, the exit codes, and the routing to `workflows/AGENTS.md` and `code/AGENTS.md`. This skill does not repeat them.
- **Build is the only go-ahead for the work.** Nothing is written before the user says Build. Build covers writing the workflow and code files, `npm run verify`, `lift deploy --dry-run` and the draft `lift deploy`. It does not cover `lift publish` or a real `lift clean`: each needs its own yes in the chat.
- **No secret, ever.** Never write an API key, token or password in a file, and never ask the user to paste one into the chat. A node reaches a service through an n8n credential, named with `credential('<key>')` (see `npx lift help creds sync`).
- **Verify and dry-run pass before any deploy.** Never run `lift deploy` without `--dry-run` while either fails.
- **The decision summary stays in the chat.** Write no plan, spec or notes file for it.

## 1. Read the request

The argument is what the workflow should do, in the user's words. No argument: ask for it in one sentence and wait.

Read what the request touches before the interview, so you ask only what the files do not settle:

- `boilerlift.config.ts`: the targets.
- `workflows/`: a workflow the request changes, or one that already does something close. Reuse its node types and `typeVersion`s.
- `code/`: the Code node functions already there.
- `credentials/<target>.ts`, when it exists: the credentials the instance already holds. When it is missing and the workflow needs a credential, run `npx lift creds sync --json` (it only reads the instance).

## 2. Interview

Read `.claude/skills/BOILERLIFT:interviewing/SKILL.md` and follow its rounds, with the request and what step 1 found as the subject.

Replace its ending: when no question is left, go to step 3 instead of waiting for a plan approval.

## 3. Show the decision summary

Read `.claude/skills/BOILERLIFT:plan/SKILL.md` and write the summary in the chat, in its template.

Then ask one question: **Build?**, with two answers: `Build` (write, check and deploy a draft) and `One more round` (the user names what is missing, and the interview goes on). Use `AskUserQuestion` when it exists; otherwise end the message with the question and wait.

On `Build`, run steps 4 to 7 without asking anything else.

## 4. Write the files

Follow `workflows/AGENTS.md` and `code/AGENTS.md`.

- One `workflows/<name>.workflow.ts` per workflow, a `defineWorkflow({...})` default export. A changed workflow keeps its file name: the name is its identity on n8n.
- The JavaScript of each Code node is a function in `code/<name>.ts`, with its test in `code/<name>.test.ts`. Write the test from the summary's **Edge cases & rules**, one test per rule.
- A node whose parameters you do not know for sure: do not guess them. Copy them from a workflow already in `workflows/`, or ask the user to build that one node in the n8n editor and paste its export (⋯ → Download), then carry on.

## 5. Check

Run `npm run verify`, then `npx lift deploy --dry-run --json`. Read the result as `AGENTS.md` says: `exitCode` first, then each failed workflow.

Fix the files and run both again until both pass. A failure only the user can fix (an unreachable instance, a rejected API key, a missing credential): stop, tell the user what to do in one sentence, using the next step `AGENTS.md` gives for that exit code, and wait.

## 6. Deploy the draft

Run `npx lift deploy --json`. It delivers drafts and publishes nothing. Read `exitCode`, then each entry of `results`. A draft opens in the n8n editor at `<instance>/workflow/<id>`, from the `instance` of the result and the `id` of its entry.

Exit 8 (a credential is missing on the instance): tell the user which credential to create in n8n, then run `npx lift creds sync --json` and step 5 again once they say it is done.

## 7. QA

Read `.claude/skills/BOILERLIFT:qa/SKILL.md` and give its scenarios in the chat, for the draft just deployed.

Then ask: **Publish?**, with two answers: `Publish` (the scenarios pass) and `I need to fix` (something is wrong).

- `I need to fix`: ask what is wrong unless the user already said it. Fix it within the decisions, run steps 5 and 6 again, then give only the QA scenarios the fix touches, and ask again.
- `Publish`: run `npx lift publish --json --yes`, for the target the draft went to. This is the yes that `AGENTS.md` asks for.

## 8. Reply

End with one line each, and omit a line that has nothing to say:

```text
Workflow: workflows/<name>.workflow.ts (created | changed)
Code: code/<name>.ts, tested by code/<name>.test.ts
Checks: npm run verify and lift deploy --dry-run passed
Draft: <link on n8n> (target dev)
Published: yes | no, waiting for your go-ahead
Assumptions: <the Open assumptions of the summary, for the user to check>
```
