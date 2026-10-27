import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = process.env.TURSO_DATABASE_URL
  ? new PrismaClient({
      adapter: new (await import("@prisma/adapter-libsql")).PrismaLibSQL({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
    })
  : new PrismaClient();

let passwords = {};
try {
  passwords = JSON.parse(process.env.SEED_USER_PASSWORDS_JSON || "{}");
} catch {
  throw new Error("SEED_USER_PASSWORDS_JSON must be a valid JSON object keyed by user email.");
}

const users = [
  { name: "Owner (Sir)", email: "owner@classiqueinteriors.in", role: "OWNER", city: "Kolkata", phone: "" },
  { name: "Varsha", email: "varsha@classiqueinteriors.in", role: "MANAGER", city: "Kolkata", phone: "+919000000101" },
  { name: "Kaushal", email: "kaushal@classiqueinteriors.in", role: "MANAGER", city: "Kolkata", phone: "+919000000102" },
  { name: "Priyanshi", email: "priyanshi@classiqueinteriors.in", role: "MANAGER", city: "Kolkata", phone: "+919000000103" },
  { name: "Procurement Manager 4", email: "manager4@classiqueinteriors.in", role: "MANAGER", city: "Kolkata", phone: "" },
  { name: "Sujita", email: "sujita@classiqueinteriors.in", role: "FIELD", city: "Bangalore", phone: "+919000000201" },
  { name: "Aryan", email: "aryan@classiqueinteriors.in", role: "FIELD", city: "Bangalore", phone: "+919000000202" },
  { name: "Jaswant", email: "jaswant@classiqueinteriors.in", role: "FIELD", city: "Hyderabad", phone: "+919000000203" },
];

async function main() {
  const userPasswords = users.map((u) => passwords[u.email]);
  if (userPasswords.some((password) => typeof password !== "string" || password.length < 16)) {
    throw new Error("Set a unique SEED_USER_PASSWORDS_JSON password of at least 16 characters for every seeded account.");
  }
  if (new Set(userPasswords).size !== userPasswords.length) {
    throw new Error("Each seeded account must have a different password.");
  }
  for (const u of users) {
    const passwordHash = await bcrypt.hash(passwords[u.email], 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, city: u.city, phone: u.phone || null },
      create: { ...u, phone: u.phone || null, passwordHash },
    });
  }
  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
