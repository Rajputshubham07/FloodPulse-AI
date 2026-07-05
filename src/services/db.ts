import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";

// Ensure a single PrismaClient is used in Next.js development
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
const sqlite = new Database(dbPath);
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
