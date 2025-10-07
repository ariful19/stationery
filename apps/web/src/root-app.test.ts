import { fixture, html } from '@open-wc/testing';
import { describe, expect, it } from 'vitest';
import './root-app';

describe('app-root', () => {
  it('renders shared greeting', async () => {
    const element = await fixture<HTMLElement>(html`<app-root></app-root>`);
    expect(element.shadowRoot?.textContent).toContain('Hello, from the shared package!');
  });
});
