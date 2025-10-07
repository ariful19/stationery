import { fixture, html } from '@open-wc/testing';
import { describe, expect, it } from 'vitest';
import './root-app';

describe('app-root', () => {
  it('renders app shell with navigation', async () => {
    const element = await fixture<HTMLElement>(html`<app-root></app-root>`);
    const shell = element.shadowRoot?.querySelector('app-shell');
    expect(shell).toBeTruthy();
    const navItems = shell?.shadowRoot?.querySelectorAll('nav ul li');
    expect(navItems?.length).toBeGreaterThan(0);
  });
});
