import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

export function createPrismaClient(
  connectionString: string,
): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
  });
}

export {
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";

export * from "../generated/prisma/enums.js";