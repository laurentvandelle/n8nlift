---
name: "BOILERLIFT:interviewing"
description: Interviews the user about an n8n workflow, in rounds of multiple-choice questions, until shared understanding of what it does. Use when BOILERLIFT:ship needs the interview, or when the user invokes /BOILERLIFT:interviewing to think a workflow through before building it.
---

Interview the user until you both understand the workflow the same way. Map it as a **design tree**: every decision branches into the decisions that hang off it.

## The decisions of a workflow

Walk these branches. Skip one the request or the project files already settle.

- **Trigger**: what starts it (a manual click, a schedule, a webhook, an event of a service), and how often.
- **Input**: the data it receives, and an example of one item.
- **Steps**: each service it calls or each transformation it makes, in order. Which steps need a Code node.
- **Services and credentials**: each service it reaches, and the n8n credential it uses. A credential is created in n8n by the user: never ask for the secret itself.
- **Output**: what it produces, writes or sends, and where. An example of the result.
- **Failures**: what happens when a service fails, an item is invalid, or there is nothing to do.
- **Target**: the target of `boilerlift.config.ts` it goes to, when there are several.
- **Name**: its stable name, the workflow file name (1 to 64 lowercase letters, digits or dashes), and its title in n8n.

## Rounds

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask now without guessing at answers you have not heard yet. Ask the frontier in one round, **at most 4 questions**. When it holds more than 4, ask the 4 that unblock the most decisions; the rest wait for the next round. Then wait for the answers.

Use the **AskUserQuestion** tool for every frontier question, when it exists. One call is one round. Each question:

- is multiple-choice, with 2 to 4 options
- has a short header (12 characters at most)
- puts your recommended option **first**, with `(Recommended)` at the end of its label
- gives each option a label and a one-line description
- is written in the user's language

AskUserQuestion always offers Other: do not add it yourself. When the user picks Other, wait for their text before going on. Without AskUserQuestion, ask the same questions in the chat, with numbered options and the recommended one first.

Each answer reshapes the tree. Recompute the frontier and ask the next round. A question whose answer depends on another question still open belongs to a later round.

## Facts are yours, decisions are the user's

Look up a fact yourself, never ask the user for it: the targets, the workflows and Code node functions already there, the credentials in `credentials/<target>.ts`. Put every decision to the user and wait.

## Done

The interview is done when the frontier is empty: every branch visited, nothing silently assumed. Then hand back to the caller. Invoked on its own, write the summary of `.claude/skills/BOILERLIFT:plan/SKILL.md` in the chat, and build nothing until the user says so.
