import { createFinanceApiClient } from "@finance/api-client";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export function getFinanceApi() {
  if (!configuredApiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is required. Use http://10.0.2.2:3001 for the Android emulator or your computer LAN address on a device.",
    );
  }
  return createFinanceApiClient({ baseUrl: configuredApiUrl });
}
