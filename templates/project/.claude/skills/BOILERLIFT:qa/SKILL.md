---
name: "BOILERLIFT:qa"
description: Writes the three critical QA scenarios a person runs in n8n on a deployed workflow draft, from its decision summary and the workflow files. Scores each candidate path and keeps the three that best show the workflow works, each as numbered steps and an expected result. Can limit the output to the scenarios a fix touches. Does not run them. Use when BOILERLIFT:ship needs the scenarios after a draft deploy or a fix, or when the user invokes /BOILERLIFT:qa.
---

Write the three critical QA scenarios for one workflow draft. Do not run them: the user runs them in n8n before publishing, so three sharp paths beat a long list.

## Input

- The decision summary in this conversation (the `BOILERLIFT:plan` template). It is the source of truth. None in the conversation: stop and say there is nothing to test against.
- The workflow file `workflows/<name>.workflow.ts` and the Code node functions it uses in `code/`.
- The draft's link in the n8n editor, `<instance>/workflow/<id>`, from the `lift deploy --json` result, when there is one.
- Optional: a **fix description**, after a fix, to ask only for the scenarios the fix touches.

## Candidates

Write one candidate per distinct outcome the summary and the files both support: the main path, and each failure or edge case a real run would actually hit.

Skip a behavior the summary does not describe, and a minor variant that confirms the same result again. `npm test` already covers each Code node function on its own: a candidate checks what the user sees in n8n or in the service the workflow reaches.

A person must be able to run it: open the draft in the n8n editor, put the starting state in place (a record in a service, a test payload, a pinned input), run the workflow with **Execute workflow** or its trigger, and see the result. Reading the code is not a candidate.

## Score

Score every candidate. Do not print the scores or the candidates you drop. Each criterion is 0, 1 or 2.

- **Breaks the workflow.** 2 if a failed run means the workflow does not do what the summary promises. 1 if one required fact is wrong and the main path can still pass. 0 if the failure is cosmetic or repeats a result already scored.
- **A run hits it.** 2 if a normal run reaches this path. 1 if a run reaches it only when a state the summary names is present. 0 if no run can reach it.
- **Stands alone.** 2 if its setup and its expected result differ from every higher-scored candidate. 1 if it shares a setup and checks a different result. 0 if it confirms the same result again.

Keep the three highest totals. A tie goes to the path a normal run hits first. Drop a candidate that scores 0 on **A run hits it**. Fewer than three remain: write only those. None remain: say there is nothing to test.

## Only the scenarios a fix touches

With a fix description, score as above, then keep only the scenarios whose steps or expected result the fix changes, plus any candidate the fix itself introduces that scores into the top three. None is touched: print `# QA` then `No scenario is affected by this fix.` and stop.

## Output

Exactly this format, highest score first:

```markdown
# QA

### <short name>
Steps:
1. <setup: put the starting state in place>
2. Open the draft in n8n: <link>
3. <next step>

Expected: <one or two lines of observable facts>
```

- Step 1 is the setup. Each step is one imperative sentence.
- Expected is one or two lines of facts a person can see: a message received, a row written, an output item in the editor. Exact text from the summary, verbatim.
- No precondition block, no checkboxes.

## Example

```markdown
# QA

### No new customer
Steps:
1. Make sure Stripe has no customer created yesterday.
2. Open the draft in n8n: https://n8n.example.com/workflow/42
3. Click **Execute workflow**.

Expected: `#sales` gets one message, `No new customer yesterday.`
```
