const fs = require("fs");
const path = require("path");

const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
const dbServicePath = path.resolve(__dirname, "../src/services/db.ts");

console.log("🔄 Starting database adapter conversion to PostgreSQL/PostGIS...");

// 1. Swap schema provider
if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, "utf8");
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schemaContent, "utf8");
  console.log("✅ Updated schema.prisma provider to 'postgresql'");
}

// 2. Swap db service connection client
if (fs.existsSync(dbServicePath)) {
  const pgDbServiceContent = `import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`;
  fs.writeFileSync(dbServicePath, pgDbServiceContent, "utf8");
  console.log("✅ Updated db.ts to load PostgreSQL client adapters");
}

console.log("\n🚀 Conversion complete! Next steps:");
console.log("1. Add a PostgreSQL connection string to your environment (DATABASE_URL)");
console.log("2. Run: npx prisma generate");
console.log("3. Run: npx prisma db push");
console.log("4. Deploy live!");
