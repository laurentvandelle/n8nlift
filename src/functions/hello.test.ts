import { describe, expect, test } from 'vitest';
import { httpMessage, inc } from '@/functions/hello';

describe('hello', () => {
  test('Should increment a number', () => {
    // Given
    const nb = 3;

    // When
    const response = inc(nb);

    // Then
    expect(response).toEqual(4);
  });

  test('Should return http message', () => {
    // Given
    const message = 'test message';

    // When
    const response = httpMessage(message);

    // Then
    expect(response.code).toEqual(200);
    expect(response.message).toEqual(message);
  });
});
