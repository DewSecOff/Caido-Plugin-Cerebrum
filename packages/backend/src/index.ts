import type { DefineAPI, DefineEvents, SDK } from "caido:plugin";

// Singleton DB instance for re-use
let dbInstance: Awaited<ReturnType<SDK["meta"]["db"]>> | null = null;

// Backend entry point
export async function init(sdk: SDK<BackendAPI>) {
  console.log("📦 Cerebrum backend loaded");
  sdk.console.log("📦 Cerebrum backend loaded");

  // Access the Caido-provided embedded SQLite database
  const db = await sdk.meta.db();

  // Register API method to save a new request
  sdk.api.register("saveRequest", async (_sdk, req: CerebrumRequest) => {
    try {
      await initDatabase(db, sdk, req);
      await dumpAllRequests(db, sdk); // optional debug output
    } catch (e) {
      sdk.console.log(`❌ Failed to save request: ${e}`);
    }

    return "OK";
  });

  sdk.console.log("Database initialized.");

  // Register API method to get all stored requests
  sdk.api.register("getAllRequests", async () => {
    const db = await sdk.meta.db();
    const stmt = await db.prepare("SELECT * FROM requests");
    const rows = await stmt.all<DBRow>();
    sdk.console.log(`🚨 Raw rows from DB: ${rows}`);

    // Transform DB rows into frontend-friendly shape
    const tab_request = rows.map<CerebrumEntry>((row) => ({
      id: row.id,
      time: row.time,
      host: row.host,
      path: row.path,
      port: row.port,
      isTls: !!row.isTls,
      reqRaw: row.reqRaw,
      method: extractMethod(row.reqRaw),
      status: row.status,
      reqLength: row.reqLength,
      respLength: row.respLength,
      pending: row.pending,
      note: row.note,
    }));

    sdk.console.log(`Affichage tab : ${tab_request}`);
    return tab_request;
  });

  // Register API method to update a request's note/pending
  sdk.api.register("updateRequest", async (_sdk, req: { id: string; note: string; pending: string }) => {
    const stmt = await db.prepare(`
      UPDATE requests
      SET note = ?, pending = ?
      WHERE id = ?
    `);
    await stmt.run(req.note, req.pending, req.id);
    sdk.console.log(`✅ Updated request ${req.id}`);
  });

  // Register API method to delete a request by ID
  sdk.api.register("deleteRequest", async (_sdk, id: string) => {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`DELETE FROM requests WHERE id = ?`);
    await stmt.run(id);
  });
}

// Initialize the SQLite DB schema and insert request data
async function initDatabase(db: Awaited<ReturnType<SDK["meta"]["db"]>>, sdk: SDK, req: CerebrumRequest) {
  try {
    // Create table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT,
        host TEXT,
        path TEXT,
        port INTEGER,
        isTls INTEGER,
        reqRaw TEXT,
        status INTEGER,
        reqLength INTEGER,
        respLength INTEGER,
        pending TEXT,
        note TEXT
      )
    `);

    // Insert or replace request record
    const stmt = await db.prepare(`
      INSERT OR REPLACE INTO requests 
      (time, host, path, port, isTls, reqRaw, status, reqLength, respLength, pending, note) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      req.time,
      req.host,
      req.path,
      req.port,
      req.isTls ? 1 : 0,
      req.reqRaw,
      req.status,
      req.reqLength,
      req.respLength,
      "Not touched", // default pending
      "Empty"        // default note
    );

    sdk.console.log(`Post run : ${result.lastInsertRowid}`);
    return db;
  } catch (error) {
    sdk.console.error(`Database initialization failed: ${error}`);
    throw error;
  }
}

// API type definitions for frontend → backend calls
export type BackendAPI = DefineAPI<{
  saveRequest: (sdk: SDK, req: CerebrumRequest) => Promise<void>;
  getAllRequests: () => Promise<CerebrumEntry[]>;
  updateRequest: (sdk: SDK, req: { id: string; note: string; pending: string }) => Promise<void>;
  deleteRequest: (sdk: SDK, id: string) => Promise<void>;
}>;

// Optional: event types for backend → frontend communication
export type BackendEvents = DefineEvents<{
  "new-request": (req: CerebrumRequest) => void;
}>;

// Frontend payload type when saving a request
export type CerebrumRequest = {
  time: string;
  host: string;
  path: string;
  port: number;
  isTls: boolean;
  reqRaw: string;
  status: number;
  reqLength: number;
  respLength: number;
};

// Internal database row structure
type DBRow = {
  id: string;
  time: string;
  host: string;
  path: string;
  port: number;
  isTls: number; // SQLite uses INTEGER for booleans
  reqRaw: string;
  status: number;
  reqLength: number;
  respLength: number;
  pending: string;
  note: string;
};

// Return shape sent back to frontend
export type CerebrumEntry = {
  id: string;
  time: string;
  host: string;
  path: string;
  port: number;
  isTls: boolean;
  reqRaw: string;
  method: string;
  status: number;
  reqLength: number;
  respLength: number;
  pending: string;
  note: string;
};

// Helper: Dump all rows for debugging
async function dumpAllRequests(db: Awaited<ReturnType<SDK["meta"]["db"]>>, sdk: SDK) {
  try {
    const stmt = await db.prepare("SELECT * FROM requests");
    const rows = await stmt.all<DBRow>();

    sdk.console.log(`📤 Dumping ${rows.length} requests from DB:`);

    for (const row of rows) {
      sdk.console.log(
        `🧾 [${row.id}] ${row.host}:${row.port} TLS=${!!row.isTls}\n${row.reqRaw}\n`
      );
    }
  } catch (error) {
    sdk.console.error(`❌ Failed to dump requests: ${error}`);
  }
}

// Extract HTTP method from raw request
function extractMethod(raw: string): string {
  return raw.split(" ")[0] || "UNKNOWN";
}

// Optional: extract path or URL from raw request (unused)
function extractUrl(raw: string): string {
  const parts = raw.split(" ");
  return (parts.length > 1 ? parts[1] : "/") || " ";
}
