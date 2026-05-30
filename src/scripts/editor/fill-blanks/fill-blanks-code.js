const BLANK_PATTERN = /\[\[blank(?::([A-Za-z0-9_-]+))?(?:\|([^\]]*))?\]\]/g;

/**
 * Parses a fill-in-the-code template into static text and blank segments.
 * Supported markers:
 * - [[blank]]
 * - [[blank:1]]
 * - [[blank:name|placeholder]]
 * @param {string} template Template code with blank markers.
 * @returns {Array<object>} Ordered template parts.
 */
export function parseFillBlanksTemplate(template = '') {
  const source = String(template || '');
  const parts = [];
  const seenBlankIds = new Set();
  let cursor = 0;
  let blankIndex = 0;
  let match;

  BLANK_PATTERN.lastIndex = 0;

  while ((match = BLANK_PATTERN.exec(source)) !== null) {
    if (match.index > cursor) {
      parts.push({
        type: 'text',
        text: source.slice(cursor, match.index),
      });
    }

    blankIndex += 1;
    const id = match[1] || String(blankIndex);
    const valueKey = seenBlankIds.has(id)
      ? `${id}__${blankIndex}`
      : id;
    seenBlankIds.add(id);

    parts.push({
      type: 'blank',
      id,
      valueKey,
      placeholder: match[2] || '',
      marker: match[0],
      index: blankIndex,
    });

    cursor = match.index + match[0].length;
  }

  if (cursor < source.length) {
    parts.push({
      type: 'text',
      text: source.slice(cursor),
    });
  }

  return parts;
}

/**
 * Returns whether a code template contains at least one blank marker.
 * @param {string} template Template code.
 * @returns {boolean} True when the template contains blank markers.
 */
export function hasFillBlanks(template = '') {
  BLANK_PATTERN.lastIndex = 0;
  return BLANK_PATTERN.test(String(template || ''));
}

/**
 * Builds executable code from a fill-in-the-code template and blank values.
 * @param {string} template Template code with blank markers.
 * @param {object} values Values keyed by blank id.
 * @returns {string} Code with markers replaced by learner input.
 */
export function composeFillBlanksCode(template = '', values = {}) {
  const parts = parseFillBlanksTemplate(template);

  return parts.map((part) => {
    if (part.type !== 'blank') {
      return part.text;
    }

    return values?.[part.valueKey || part.id] ?? '';
  }).join('');
}
