const LEGAL_SUFFIXES = new Set([
  'inc',
  'incorporated',
  'llc',
  'ltd',
  'limited',
  'corp',
  'corporation',
  'co',
  'company',
  'sa',
  'sas',
  'gmbh',
  'plc',
  'lp',
  'pc',
  'pty',
]);

const STORE_TOKEN_RE = /^(store|sucursal|local|branch|#)$/;

export type PreparedMerchantName = {
  original: string;
  displayName: string;
  key: string;
};

export function prepareMerchantName(raw: string): PreparedMerchantName | null {
  const original = raw.trim();
  if (!original) return null;

  const tokens = tokenize(original);
  if (tokens.length === 0) return null;

  const stripped = stripDecorations(tokens);
  const source = stripped.length > 0 ? stripped : tokens;

  return {
    original,
    displayName: toDisplayName(source),
    key: source.map((token) => token.normalized).join(' '),
  };
}

export function merchantKeyFromName(raw: string): string | null {
  return prepareMerchantName(raw)?.key ?? null;
}

function tokenize(raw: string): Array<{ original: string; normalized: string }> {
  const ascii = raw
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/&/g, ' and ');
  const parts = ascii.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  return parts.map((part) => ({
    original: part,
    normalized: part.toLowerCase(),
  }));
}

function stripDecorations(
  tokens: Array<{ original: string; normalized: string }>,
): Array<{ original: string; normalized: string }> {
  let end = tokens.length;

  while (end > 1) {
    const token = tokens[end - 1];
    if (!token) break;
    if (/^\d+$/.test(token.normalized) || STORE_TOKEN_RE.test(token.normalized)) {
      end -= 1;
      continue;
    }
    if (LEGAL_SUFFIXES.has(token.normalized)) {
      end -= 1;
      continue;
    }
    break;
  }

  return tokens.slice(0, end);
}

function toDisplayName(
  tokens: Array<{ original: string; normalized: string }>,
): string {
  return tokens
    .map((token) => {
      if (token.original === token.original.toUpperCase() && token.original.length <= 4) {
        return token.original.toUpperCase();
      }
      const lower = token.normalized;
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(' ');
}
