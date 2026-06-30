import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

import seedData from "../../data/providers.seed.json";
import type { Provider, ProviderWebsites, StaffComment } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "referral.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
    seedIfEmpty(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS providers (
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
    );

    CREATE TABLE IF NOT EXISTS staff_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
    CREATE INDEX IF NOT EXISTS idx_comments_provider ON staff_comments(provider_id);
  `);
}

function seedIfEmpty(database: Database.Database) {
  const count = database.prepare("SELECT COUNT(*) as c FROM providers").get() as { c: number };
  if (count.c > 0) return;

  const insert = database.prepare(`
    INSERT INTO providers (
      name, type, insurance, session_format, address, email, phone, websites,
      specialties, modalities, low_cost, licensed_states, description,
      accepting_clients, active
    ) VALUES (
      @name, @type, @insurance, @session_format, @address, @email, @phone, @websites,
      @specialties, @modalities, @low_cost, @licensed_states, @description,
      @accepting_clients, @active
    )
  `);

  const tx = database.transaction((rows: typeof seedData) => {
    for (const row of rows) {
      insert.run({
        name: row.name,
        type: row.type,
        insurance: JSON.stringify(row.insurance),
        session_format: row.session_format,
        address: row.address,
        email: row.email,
        phone: row.phone,
        websites: JSON.stringify(row.websites || {}),
        specialties: JSON.stringify(row.specialties || []),
        modalities: JSON.stringify(row.modalities || []),
        low_cost: row.low_cost ? 1 : 0,
        licensed_states: JSON.stringify(row.licensed_states || ["NY"]),
        description: row.description || "",
        accepting_clients: row.accepting_clients ? 1 : 0,
        active: row.active !== false ? 1 : 0,
      });
    }
  });

  tx(seedData as typeof seedData);
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

export interface ProviderFilters {
  q?: string;
  insurance?: string[];
  type?: string[];
  session_format?: string[];
  specialties?: string[];
  low_cost?: boolean;
  accepting_clients?: boolean;
  active_only?: boolean;
}

export function listProviders(filters: ProviderFilters = {}): Provider[] {
  const database = getDb();
  let sql = "SELECT * FROM providers WHERE 1=1";
  const params: Record<string, string | number> = {};

  if (filters.active_only !== false) {
    sql += " AND active = 1";
  }

  if (filters.q) {
    sql += ` AND (
      name LIKE @q OR description LIKE @q OR email LIKE @q
      OR address LIKE @q OR phone LIKE @q
    )`;
    params.q = `%${filters.q}%`;
  }

  if (filters.low_cost) {
    sql += " AND low_cost = 1";
  }

  if (filters.accepting_clients) {
    sql += " AND accepting_clients = 1";
  }

  sql += " ORDER BY name COLLATE NOCASE ASC";

  const rows = database.prepare(sql).all(params) as ProviderRow[];
  let providers = rows.map(rowToProvider);

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

export function getProvider(id: number) {
  const database = getDb();
  const row = database.prepare("SELECT * FROM providers WHERE id = ?").get(id) as ProviderRow | undefined;
  if (!row) return null;

  const comments = database
    .prepare("SELECT * FROM staff_comments WHERE provider_id = ? ORDER BY created_at DESC")
    .all(id) as StaffComment[];

  return { ...rowToProvider(row), comments };
}

export function updateProvider(
  id: number,
  data: Partial<Omit<Provider, "id" | "created_at" | "updated_at">>
) {
  const database = getDb();
  const existing = database.prepare("SELECT id FROM providers WHERE id = ?").get(id);
  if (!existing) return null;

  const fields: string[] = [];
  const params: Record<string, string | number | null> = { id };

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

  for (const [key, transform] of Object.entries(map)) {
    if (key in data) {
      fields.push(`${key} = @${key}`);
      params[key] = transform(data[key as keyof typeof data]);
    }
  }

  if (fields.length === 0) return getProvider(id);

  fields.push("updated_at = datetime('now')");
  database.prepare(`UPDATE providers SET ${fields.join(", ")} WHERE id = @id`).run(params);
  return getProvider(id);
}

export function addComment(providerId: number, authorName: string, body: string): StaffComment | null {
  const database = getDb();
  const provider = database.prepare("SELECT id FROM providers WHERE id = ?").get(providerId);
  if (!provider) return null;

  const result = database
    .prepare(
      "INSERT INTO staff_comments (provider_id, author_name, body) VALUES (?, ?, ?)"
    )
    .run(providerId, authorName.trim(), body.trim());

  return database
    .prepare("SELECT * FROM staff_comments WHERE id = ?")
    .get(result.lastInsertRowid) as StaffComment;
}

export function deleteComment(commentId: number): boolean {
  const database = getDb();
  const result = database.prepare("DELETE FROM staff_comments WHERE id = ?").run(commentId);
  return result.changes > 0;
}

export function getFilterOptions() {
  const providers = listProviders({ active_only: false });
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
