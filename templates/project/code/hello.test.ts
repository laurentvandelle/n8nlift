import { describe, expect, test } from 'vitest';
import { sayHello } from '#code/hello';

describe('sayHello', () => {
  test('should add the greeting to each item when it runs', () => {
    const items = [{ json: { name: 'Ada' } }];

    const result = sayHello(items);

    expect(result).toEqual([{ json: { name: 'Ada', message: 'Hello from Boilerlift' } }]);
  });
});
