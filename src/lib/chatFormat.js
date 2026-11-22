/**
 * Serialize assistant reply, optional card, and ordered multi-blocks into chat_messages.content.
 * Keeps existing string column compatible without altering database schema.
 * @param {string} text
 * @param {Record<string, any> | null | undefined} [card]
 * @param {Array<Record<string, any>> | null | undefined} [blocks]
 * @returns {string}
 */
export function serializeAssistantContent(text, card = null, blocks = null) {
  if (Array.isArray(blocks) && blocks.length > 0) {
    return JSON.stringify({
      __pensBlocksV2: true,
      text: text || '',
      blocks
    });
  }
  if (!card) return text || '';
  return JSON.stringify({
    __pensCardV1: true,
    text: text || '',
    card
  });
}

/**
 * Parse stored chat_messages.content into displayable text, primary card, and unified blocks[].
 * Automatically upgrades legacy __pensCardV1 and plain text entries into blocks[].
 * @param {string} rawContent
 * @returns {{ text: string, card: Record<string, any> | null, blocks: Array<Record<string, any>> }}
 */
export function parseAssistantContent(rawContent) {
  const raw = rawContent || '';
  if (!raw.startsWith('{')) {
    return {
      text: raw,
      card: null,
      blocks: raw ? [{ type: 'markdown', content: raw }] : []
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__pensBlocksV2 === true && Array.isArray(parsed.blocks)) {
      const blocks = parsed.blocks.filter((b) => b && typeof b.type === 'string');
      return {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        card: blocks.find((b) => b.type !== 'markdown') || null,
        blocks
      };
    }
    if (parsed && parsed.__pensCardV1 === true) {
      const text = typeof parsed.text === 'string' ? parsed.text : '';
      const card = parsed.card || null;
      const blocks = [
        ...(text ? [{ type: 'markdown', content: text }] : []),
        ...(card ? [card] : [])
      ];
      return { text, card, blocks };
    }
  } catch {
    // Plain text message starting with '{' falls back unchanged
  }

  return {
    text: raw,
    card: null,
    blocks: raw ? [{ type: 'markdown', content: raw }] : []
  };
}
