import { MongoClient, type Db, type Collection } from "mongodb";
import { getAppEnv } from "@/lib/env";

type RateLimitDocument = {
  _id: string;
  bucket: string;
  key: string;
  count: number;
  resetAt: Date;
  expireAt: Date;
};

type AuditLogDocument = {
  actorUserId?: string | null;
  action: string;
  category?: "admin" | "classroom" | "socket" | "upload" | "auth" | "other";
  reason?: string | null;
  status?: "success" | "rejected" | "error";
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
};

const globalForMongoOps = globalThis as typeof globalThis & {
  __gameduMongoClient?: MongoClient;
  __gameduMongoDb?: Db;
  __gameduMongoIndexesEnsured?: boolean;
};

function inferDbNameFromUrl(url: string) {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/^\//, "");
  return pathname || "gamedu";
}

async function connectMongo() {
  if (globalForMongoOps.__gameduMongoClient && globalForMongoOps.__gameduMongoDb) {
    return {
      client: globalForMongoOps.__gameduMongoClient,
      db: globalForMongoOps.__gameduMongoDb,
    };
  }

  const env = getAppEnv();
  const client = new MongoClient(env.DATABASE_URL);
  await client.connect();
  const db = client.db(inferDbNameFromUrl(env.DATABASE_URL));

  globalForMongoOps.__gameduMongoClient = client;
  globalForMongoOps.__gameduMongoDb = db;

  return { client, db };
}

export async function getOperationalDb(): Promise<Db> {
  const { db } = await connectMongo();
  return db;
}

export async function getRateLimitCollection(): Promise<Collection<RateLimitDocument>> {
  const db = await getOperationalDb();
  return db.collection<RateLimitDocument>("appRateLimits");
}

export async function getAuditLogCollection(): Promise<Collection<AuditLogDocument>> {
  const db = await getOperationalDb();
  return db.collection<AuditLogDocument>("appAuditLogs");
}

export async function ensureOperationalIndexes() {
  if (globalForMongoOps.__gameduMongoIndexesEnsured) {
    return;
  }

  const rateLimits = await getRateLimitCollection();
  await rateLimits.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0, name: "expireAt_ttl" });
  await rateLimits.createIndex({ bucket: 1, key: 1 }, { name: "bucket_key_lookup" });

  const auditLogs = await getAuditLogCollection();
  await auditLogs.createIndex({ timestamp: -1 }, { name: "timestamp_desc" });
  await auditLogs.createIndex({ actorUserId: 1, timestamp: -1 }, { name: "actor_timestamp" });
  await auditLogs.createIndex({ action: 1, timestamp: -1 }, { name: "action_timestamp" });
  await auditLogs.createIndex({ category: 1, timestamp: -1 }, { name: "category_timestamp" });

  globalForMongoOps.__gameduMongoIndexesEnsured = true;
}

export async function pingOperationalDb(timeoutMs: number) {
  const db = await getOperationalDb();

  return Promise.race([
    db.command({ ping: 1 }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database ping timed out")), timeoutMs)
    ),
  ]);
}
