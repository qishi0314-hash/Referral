import { createClient, type Client } from "@libsql/client";
import fs from "fs";
import path from "path";

import seedData from "../../data/providers.seed.json";
import type { Provider, ProviderWebsites, StaffComment } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "referral.db");

let client: Client | null = null;
let initPromise: Promise<void> | null = null;

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL || `file:${DB_PATH}`;

  if (url.startsWith("file:")) {
    const filePath = url.replace("file:", "");
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  return createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

async function ensureReady(): Promise<Client> {
  if (!client) client = createDbClient();
  if (!initPromise) initPromise = initialize(client);
  await initPromise;
  return client;
}

async function initialize(db: Client) {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Therapist',
      insurance TEXT NOT NULL DEFAULT '[]',
      session_format TEXT NOT NULL DEFAULT 'Unknown',
      address TEXT,
      email TEXT,
      phone TEXT,
      websites TEXT NOT NULL DEFAULT '{}',
      specialties TEXT NOT NULL DEFAULT '[]',
      modalities TEXT NOT NULL DEFAULT '[]',
      low_cost INTEGER NOT NULL DEFAULT 0,
      licensed_states TEXT NOT NULL DEFAULT '["NY"]',
      description TEXT NOT NULL DEFAULT '',
      accepting_clients INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS staff_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_provider ON staff_comments(provider_id)`,
  ]);

  const count = await db.execute("SELECT COUNT(*) as c FROM providers");
  const rowCount = Number(count.rows[0]?.c ?? 0);
  if (rowCount > 0) return;

  for (const row of seedData) {
    await db.execute({
      sql: `INSERT INTO providers (
        name, type, insurance, session_format, address, email, phone, websites,
        specialties, modalities, low_cost, licensed_states, description,
        accepting_clients, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        row.name,
        row.type,
        JSON.stringify(row.insurance),
        row.session_format,
        row.address,
        row.email,
        row.phone,
        JSON.stringify(row.websites || {}),
        JSON.stringify(row.specialties || []),
        JSON.stringify(row.modalities || []),
        row.low_cost ? 1 : 0,
        JSON.stringify(row.licensed_states || ["NY"]),
        row.description || "",
        row.accepting_clients ? 1 : 0,
        row.active !== false ? 1 : 0,
      ],
    });
  }
}

type ProviderRow = {
  id: number;
  name: string;
  type: string;
  insurance: string;
  session_format: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  websites: string;
  specialties: string;
  modalities: string;
  low_cost: number;
  licensed_states: string;
  description: string;
  accepting_clients: number;
  active: number;
  created_at: string;
  updated_at: string;
};

function rowToProvider(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    insurance: JSON.parse(row.insurance),
    session_format: row.session_format,
    address: row.address,
    email: row.email,
    phone: row.phone,
    websites: JSON.parse(row.websites) as ProviderWebsites,
    specialties: JSON.parse(row.specialties),
    modalities: JSON.parse(row.modalities),
    low_cost: row.low_cost === 1,
    licensed_states: JSON.parse(row.licensed_states),
    description: row.description,
    accepting_clients: row.accepting_clients === 1,
    active: row.active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asProviderRows(result: { rows: unknown[] }): ProviderRow[] {
  return result.rows as unknown as ProviderRow[];
}

export interface ProviderFilters {
  q?: string;
  insurance?: string[];
  type?: string[];
  session_format?: string[];
  specialties?: string[];
  active_only?: boolean;
}

export async function listProviders(filters: ProviderFilters = {}): Promise<Provider[]> {
  const db = await ensureReady();
  let sql = "SELECT * FROM providers WHERE 1=1";
  const args: (string | number)[] = [];

  if (filters.active_only !== false) {
    sql += " AND active = 1";
  }

  if (filters.q) {
    sql += ` AND (
      name LIKE ? OR description LIKE ? OR email LIKE ?
      OR address LIKE ? OR phone LIKE ?
    )`;
    const q = `%${filters.q}%`;
    args.push(q, q, q, q, q);
  }

  sql += " ORDER BY name COLLATE NOCASE ASC";

  const result = await db.execute({ sql, args });
  let providers = asProviderRows(result).map(rowToProvider);

  if (filters.insurance?.length) {
    providers = providers.filter((p) =>
      filters.insurance!.some((ins) =>
        p.insurance.some((pi) => pi.toLowerCase().includes(ins.toLowerCase()))
      )
    );
  }

  if (filters.type?.length) {
    providers = providers.filter((p) => filters.type!.includes(p.type));
  }

  if (filters.session_format?.length) {
    providers = providers.filter((p) => {
      if (filters.session_format!.includes(p.session_format)) return true;
      if (p.session_format === "Both" && filters.session_format!.some((f) => f !== "Unknown"))
        return true;
      return false;
    });
  }

  if (filters.specialties?.length) {
    providers = providers.filter((p) =>
      filters.specialties!.some((s) =>
        p.specialties.some((ps) => ps.toLowerCase().includes(s.toLowerCase()))
      )
    );
  }

  return providers;
}

export async function getProvider(id: number) {
  const db = await ensureReady();
  const result = await db.execute({ sql: "SELECT * FROM providers WHERE id = ?", args: [id] });
  const rows = asProviderRows(result);
  if (rows.length === 0) return null;

  const commentsResult = await db.execute({
    sql: "SELECT * FROM staff_comments WHERE provider_id = ? ORDER BY created_at DESC",
    args: [id],
  });

  const comments = commentsResult.rows as unknown as StaffComment[];
  return { ...rowToProvider(rows[0]), comments };
}

export async function updateProvider(
  id: number,
  data: Partial<Omit<Provider, "id" | "created_at" | "updated_at">>
) {
  const db = await ensureReady();
  const existing = await db.execute({ sql: "SELECT id FROM providers WHERE id = ?", args: [id] });
  if (existing.rows.length === 0) return null;

  const map: Record<string, (v: unknown) => string | number | null> = {
    name: (v) => v as string,
    type: (v) => v as string,
    insurance: (v) => JSON.stringify(v),
    session_format: (v) => v as string,
    address: (v) => (v as string) || null,
    email: (v) => (v as string) || null,
    phone: (v) => (v as string) || null,
    websites: (v) => JSON.stringify(v),
    specialties: (v) => JSON.stringify(v),
    modalities: (v) => JSON.stringify(v),
    low_cost: (v) => ((v as boolean) ? 1 : 0),
    licensed_states: (v) => JSON.stringify(v),
    description: (v) => v as string,
    accepting_clients: (v) => ((v as boolean) ? 1 : 0),
    active: (v) => ((v as boolean) ? 1 : 0),
  };

  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  for (const [key, transform] of Object.entries(map)) {
    if (key in data) {
      fields.push(`${key} = ?`);
      args.push(transform(data[key as keyof typeof data]));
    }
  }

  if (fields.length === 0) return getProvider(id);

  fields.push("updated_at = datetime('now')");
  args.push(id);

  await db.execute({
    sql: `UPDATE providers SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  return getProvider(id);
}

export async function addComment(
  providerId: number,
  authorName: string,
  body: string
): Promise<StaffComment | null> {
  const db = await ensureReady();
  const provider = await db.execute({
    sql: "SELECT id FROM providers WHERE id = ?",
    args: [providerId],
  });
  if (provider.rows.length === 0) return null;

  const result = await db.execute({
    sql: "INSERT INTO staff_comments (provider_id, author_name, body) VALUES (?, ?, ?)",
    args: [providerId, authorName.trim(), body.trim()],
  });

  const commentId = Number(result.lastInsertRowid);
  const commentResult = await db.execute({
    sql: "SELECT * FROM staff_comments WHERE id = ?",
    args: [commentId],
  });

  return commentResult.rows[0] as unknown as StaffComment;
}

export async function deleteComment(commentId: number): Promise<boolean> {
  const db = await ensureReady();
  const result = await db.execute({
    sql: "DELETE FROM staff_comments WHERE id = ?",
    args: [commentId],
  });
  return result.rowsAffected > 0;
}

export async function getFilterOptions() {
  const providers = await listProviders({ active_only: false });
  const insurance = new Set<string>();
  const specialties = new Set<string>();
  const types = new Set<string>();

  for (const p of providers) {
    p.insurance.forEach((i) => insurance.add(i));
    p.specialties.forEach((s) => specialties.add(s));
    types.add(p.type);
  }

  return {
    insurance: Array.from(insurance).sort(),
    specialties: Array.from(specialties).sort(),
    types: Array.from(types).sort(),
  };
}
