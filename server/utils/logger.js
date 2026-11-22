const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

const TAG_COLOR = {
  SERVER: COLORS.green,
  REQ: COLORS.cyan,
  RAG: COLORS.magenta,
  GEMINI: COLORS.blue,
  WARN: COLORS.yellow,
  ERROR: COLORS.red
};

function timeStamp() {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

/**
 * Write a structured, timestamped log line to stdout or stderr.
 * @param {'SERVER' | 'REQ' | 'RAG' | 'GEMINI' | 'WARN' | 'ERROR'} tag
 * @param {string} message
 * @param {number} [startedAt]
 */
export function log(tag, message, startedAt) {
  const color = TAG_COLOR[tag] || COLORS.cyan;
  const elapsed =
    typeof startedAt === 'number'
      ? ` ${COLORS.dim}(+${Date.now() - startedAt}ms)${COLORS.reset}`
      : '';
  const line = `${COLORS.dim}[${timeStamp()}]${COLORS.reset} ${color}[${tag}]${COLORS.reset} ${message}${elapsed}`;
  if (tag === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
}
