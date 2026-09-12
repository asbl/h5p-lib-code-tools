/**
 * First-party replacement for the (unmaintained since 2023, single-maintainer)
 * `marked-admonition-extension` npm package. Recognizes the same legacy
 * `!!! type Title` / `!!!` fence syntax used in previously authored content,
 * so old content keeps rendering unchanged, but renders into the same
 * `.markdown-alert*` class scheme used by the GFM `> [!TYPE]` alert syntax
 * (see markdown-alert.css), instead of pulling in a stale third-party
 * dependency at runtime.
 *
 * Unlike the original package, matching is stack-based: a `!!!` fence nested
 * inside another one is parsed as a nested block instead of silently
 * discarding the outer block's start position.
 */

export const LEGACY_ADMONITION_TYPES = [
  'abstract', 'attention', 'bug', 'caution', 'danger', 'error', 'example',
  'failure', 'hint', 'info', 'note', 'question', 'quote', 'success', 'tip',
  'warning',
];

const TYPE_ALTERNATION = LEGACY_ADMONITION_TYPES.join('|');
const START_LINE_RE = new RegExp(`^!!!\\s+(${TYPE_ALTERNATION})(?:\\s+(.*))?$`);
const END_LINE_RE = /^!!!\s*$/;
const EARLIEST_START_RE = new RegExp(`(^|[\\r\\n])!!!\\s+(${TYPE_ALTERNATION})(?:\\s|$)`);

/**
 * Finds the line index of the `!!!` fence that closes the block opened on
 * line 0, treating any further `!!! type` line before it as a nested block.
 * @param {string[]} lines Lines of the remaining source, line 0 is the opening fence.
 * @returns {number} Index of the matching closing line, or -1 if unterminated.
 */
function findMatchingEndLine(lines) {
  let depth = 0;

  for (let i = 1; i < lines.length; i++) {
    if (START_LINE_RE.test(lines[i])) {
      depth++;
    }
    else if (END_LINE_RE.test(lines[i])) {
      if (depth === 0) {
        return i;
      }
      depth--;
    }
  }

  return -1;
}

/**
 * Creates a marked block extension supporting the legacy `!!!` admonition fence.
 * @returns {object} Marked extension usable with `marked.use()`.
 */
export function createLegacyAdmonitionExtension() {
  return { extensions: [legacyAdmonitionExtension()] };
}

/**
 * Builds the raw marked extension descriptor (as expected inside a plugin's
 * `extensions` array).
 * @returns {object} Marked block extension descriptor.
 */
function legacyAdmonitionExtension() {
  return {
    name: 'legacy-admonition',
    level: 'block',
    start(src) {
      return src.match(EARLIEST_START_RE)?.index;
    },
    tokenizer(src) {
      const firstLine = src.split('\n', 1)[0];
      const startMatch = START_LINE_RE.exec(firstLine);

      if (!startMatch) {
        return undefined;
      }

      const lines = src.split('\n');
      const endLine = findMatchingEndLine(lines);

      if (endLine === -1) {
        return undefined;
      }

      const [, variant, title = ''] = startMatch;
      const text = lines.slice(1, endLine).join('\n');
      const raw = lines.slice(0, endLine + 1).join('\n');

      const token = {
        type: 'legacy-admonition',
        raw,
        variant,
        titleTokens: [],
        tokens: [],
        childTokens: ['titleTokens', 'tokens'],
      };

      this.lexer.inlineTokens(title, token.titleTokens);
      this.lexer.blockTokens(text, token.tokens);

      return token;
    },
    renderer(token) {
      const title = this.parser.parseInline(token.titleTokens);
      const body = this.parser.parse(token.tokens);

      return `<div class="markdown-alert markdown-alert-${token.variant} markdown-alert--legacy">\n`
        + `<p class="markdown-alert-title">${title}</p>\n`
        + `${body}</div>\n`;
    },
  };
}
