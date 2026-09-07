import type {
  CreateLedgerEntry,
  ParsedFinanceCommand,
  VoiceIntakeResult,
} from "@finance/contracts";

const baseUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3001"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
  return message ?? "The request could not be completed.";
}

export async function parseVoiceCommand(
  file: { uri: string; name: string; type: string } | Blob,
  filename = "voice-capture.webm",
): Promise<VoiceIntakeResult> {
  const form = new FormData();
  if (file instanceof Blob) {
    form.append("audio", file, filename);
  } else {
    form.append("audio", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/ai-intake/voice`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the finance API. Check that it is running and try again.",
    );
  }
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return response.json() as Promise<VoiceIntakeResult>;
}

export async function createLedgerEntry(
  input: CreateLedgerEntry,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/ledger-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError(
      "Unable to reach the finance API. Check that it is running and try again.",
    );
  }
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return response.json();
}

export async function getLedgerOptions(): Promise<{
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}> {
  const response = await fetch(`${baseUrl}/ledger-entries/options`);
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return response.json() as Promise<{
    accounts: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  }>;
}

export function matchOptionId(
  options: { id: string; name: string }[],
  name?: string,
): string {
  const match = options.find(
    (option) => option.name.toLowerCase() === name?.toLowerCase(),
  );
  return match?.id ?? "";
}

export type { ParsedFinanceCommand, VoiceIntakeResult };
