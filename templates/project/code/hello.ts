// The JavaScript of the `Say hello` Code node in workflows/hello.workflow.ts.
// A Code node function runs inside n8n, so it imports nothing and uses nothing outside its own body.

type Item = { json: Record<string, unknown> };

export function sayHello(items: Item[]): Item[] {
  return items.map((item) => ({ json: { ...item.json, message: 'Hello from Boilerlift' } }));
}
