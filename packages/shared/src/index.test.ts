import { describe, expect, it } from 'vitest';

import { createGreeting } from './index.js';

describe('createGreeting', () => {
  it('returns a personalized greeting', () => {
    expect(createGreeting('Stationery')).toBe('Hello, Stationery!');
  });
});
