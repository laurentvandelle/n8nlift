# Security policy

## Supported versions

n8nlift is in early development. Only the latest published version on npm receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through [GitHub private vulnerability reporting](https://github.com/laurentvandelle/n8nlift/security/advisories/new). Include:

- what the vulnerability is and what an attacker could do with it,
- steps or a proof of concept to reproduce it,
- the n8nlift, Node.js and n8n versions involved.

You should get a first answer within 7 days. Once a fix is released, the advisory is published and you are credited unless you prefer otherwise.

## Scope

n8nlift talks to your own n8n instance with an API key you provide. Reports about how n8nlift reads, stores, logs or sends that key, or about workflows it delivers that differ from the source, are in scope. Vulnerabilities in n8n itself should go to the [n8n project](https://github.com/n8n-io/n8n/security).
