# Writing tests

Tests pin what the code does, so the code can change without fear. A test that breaks on every refactor, or passes when the code is wrong, costs more than it saves. These rules keep tests short, alike, and about behaviour.

## Shape

```ts
it('should reject the order when the stock is short', () => {
  const order = anOrder().withLine({ sku: 'sku-1', quantity: 3 }).build();
  const stock = inMemoryStock({ 'sku-1': 2 });

  const result = placeOrder(order, { stock });

  expect(result).toEqual(err({ type: 'out-of-stock', sku: 'sku-1' }));
});
```

- **The title reads `should {outcome} when {condition}`.** The list of tests then reads as a specification.
- **The body is three blocks: given, when, then.** One blank line separates them, and no comment labels them. The blank lines carry the structure, so every test reads the same at a glance.
- **One test, one behaviour.** A second behaviour gets its own test, so a failure names exactly what broke.
- **Test through the public interface.** The test calls the module through the same interface its callers use. A test that reaches into internals breaks on every refactor and proves nothing about callers.

## Dependencies

Use the real thing wherever the test can, and pick the stand-in by the kind of dependency:

| Dependency | In tests |
| --- | --- |
| In-process code (pure logic, in-memory state) | The real code |
| Has a local stand-in (in-memory store, PGLite, a temp folder) | The stand-in |
| Your own remote service | An in-memory adapter at the port |
| A third-party service (payments, email, SMS) | A mock adapter at the port |

Mocks belong to the last row only: mocking the repository's own code tests the mock, not the code.

## Data

- **Use small builders.** Build test data with builders that hold sensible defaults and take overrides (`anOrder().withLine(…).build()`), so each test states only the values it is about. Large JSON fixtures copied from test to test hide those values, and the copies drift apart.
- **Keep tests short and alike.** Use the same shape, the same builders and the same stand-ins across the suite.

## From story to test

Each acceptance criterion of a story becomes one test, named after the criterion. The criteria are then checked on every run, not once at review.

## Red, green, refactor

For new behaviour:

1. **Red.** Write the test and run it. It must fail, and for the reason the criterion states.
2. **Green.** Write the code that makes it pass.
3. **Refactor.** Clean up while the test stays green.

A test that pins existing behaviour before a refactor passes from the start. Break the code or the expectation once on purpose, watch the test fail, then restore it. A test that has never failed may be testing nothing.

## Enforced by verify

When the repository's lint includes the test rules, `verify` rejects focused, skipped and placeholder tests, tests without an assertion, sleeps, mocks of the repository's own modules, comments that label the three blocks, and titles in another shape. Run it before handing work back.
