function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(/^[^\d-]+/, "")
    .replace(/[^\d.,-].*$/, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === ",") {
    return undefined;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const normalized =
    lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseModelJsonContent(content: unknown): unknown {
  if (content !== null && typeof content === "object") {
    return content;
  }
  if (typeof content !== "string") {
    throw new Error("AI parser returned non-JSON content");
  }

  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? trimmed).trim();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("AI parser returned non-JSON content");
  }
}

/**
 * Normalizes common EN/ES model output (decimal commas, lowercase currency,
 * ISO timestamps) before Zod validation.
 */
export function coerceParsedCommandJson(value: unknown): unknown {
  const root = asRecord(value);
  if (!root) return value;
  const data = asRecord(root.data);
  if (!data) return value;

  const nextData = { ...data };
  const amount = toNumber(nextData.amount);
  if (amount !== undefined) nextData.amount = amount;

  if (typeof nextData.currency === "string") {
    nextData.currency = nextData.currency.trim().toUpperCase();
  }

  if (typeof nextData.occurredAt === "string") {
    const dateOnly = nextData.occurredAt.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) nextData.occurredAt = dateOnly[1];
  }

  const confidence = toNumber(root.confidence);
  return {
    ...root,
    data: nextData,
    ...(confidence !== undefined ? { confidence } : {}),
  };
}
