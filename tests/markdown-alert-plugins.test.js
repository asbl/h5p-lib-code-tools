import { describe, expect, it } from 'vitest';
import { Marked } from 'marked';
import markedAlert from 'marked-alert';
import { createLegacyAdmonitionExtension, LEGACY_ADMONITION_TYPES } from '../src/scripts/services/legacy-admonition-extension.js';

/**
 * Exercises the real marked-alert plugin together with the first-party
 * legacy-admonition-extension (no mocked runtime) to lock in the actual HTML
 * contract of both the legacy `!!!` admonition syntax and the GFM
 * `> [!NOTE]` alert syntax when registered together, as done in markdown.js.
 */
function render(markdown) {
  return new Marked()
    .use(createLegacyAdmonitionExtension())
    .use(markedAlert())
    .parse(markdown);
}

describe('legacy admonition extension and GFM alert plugin combined', () => {
  it('keeps rendering the legacy "!!!" admonition syntax unchanged', () => {
    const html = render('!!! info Hinweis\nAlter Inhalt bleibt funktionsfaehig.\n!!!');

    expect(html).toContain('class="markdown-alert markdown-alert-info markdown-alert--legacy"');
    expect(html).toContain('class="markdown-alert-title"');
    expect(html).toContain('Hinweis');
    expect(html).toContain('Alter Inhalt bleibt funktionsfaehig.');
  });

  it('renders every legacy admonition type', () => {
    LEGACY_ADMONITION_TYPES.forEach((type) => {
      const html = render(`!!! ${type}\nInhalt.\n!!!`);
      expect(html).toContain(`markdown-alert-${type}`);
    });
  });

  it('renders the new GFM "> [!NOTE]" alert syntax', () => {
    const html = render('> [!NOTE]\n> Neuer, abwaertskompatibler Infokasten.');

    expect(html).toContain('class="markdown-alert markdown-alert-note"');
    expect(html).not.toContain('markdown-alert--legacy');
    expect(html).toContain('class="markdown-alert-title"');
    expect(html).toContain('Neuer, abwaertskompatibler Infokasten.');
  });

  it('falls back to a plain blockquote for an unrecognized alert tag', () => {
    const html = render('> [!UNKNOWN]\n> Sollte ein normales Zitat bleiben.');

    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('markdown-alert');
  });

  it('supports both syntaxes in the same document', () => {
    const html = render(
      '!!! warning Achtung\nAlte Syntax.\n!!!\n\n> [!TIP]\n> Neue Syntax.'
    );

    expect(html).toContain('class="markdown-alert markdown-alert-warning markdown-alert--legacy"');
    expect(html).toContain('class="markdown-alert markdown-alert-tip"');
  });

  it('handles two sibling legacy blocks without a blank line between them without losing content', () => {
    const html = render('!!! note\nErster Block.\n!!!\n!!! warning\nZweiter Block.\n!!!');

    expect(html).toContain('markdown-alert-note');
    expect(html).toContain('Erster Block.');
    expect(html).toContain('markdown-alert-warning');
    expect(html).toContain('Zweiter Block.');
  });
});
