import type { DefineAPI, DefineEvents, SDK } from "caido:plugin";

// Backend entry point
export async function init(sdk: SDK<BackendAPI, BackendEvents>) {
  
  const db = await sdk.meta.db();

  // Ensure DB table exists (only once at plugin startup)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT,
      host TEXT,
      path TEXT,
      port INTEGER,
      isTls INTEGER,
      reqRaw TEXT,
      method TEXT,
      url TEXT,
      headers TEXT,
      body TEXT,
      status TEXT,
      reqLength INTEGER,
      pending TEXT,
      note TEXT
    )
  `);

  // Register API method to save a new request
  sdk.api.register("saveRequest", async (_sdk, req: CerebrumRequest) => {
    try {
      await insertRequest(db, sdk, req);
      sdk.api.send("new-request", req);
    } catch (e) {
      //sdk.console.log(`❌ Failed to save request: ${e}`);
    }
    return "OK";
  });

  //sdk.console.log("Database initialized.");

  // Register API method to get all stored requests
  sdk.api.register("getAllRequests", async () => {
    //const db = await sdk.meta.db();
    const stmt = await db.prepare("SELECT * FROM requests");
    const rows = await stmt.all<DBRow>();
    //sdk.console.log(`🚨 Raw rows from DB: ${rows}`);

    // Transform DB rows into frontend-friendly shape
    const tab_request = rows.map<CerebrumEntry>((row) => ({
      id: row.id,
      time: row.time,
      host: row.host,
      path: row.path,
      port: row.port,
      isTls: !!row.isTls,
      reqRaw: row.reqRaw,
      method: row.method,
      url: row.url,
      headers: JSON.parse(row.headers || "[]"),
      body: row.body,
      status: row.status,
      reqLength: row.reqLength,
      pending: row.pending,
      note: row.note,
    }));

    //sdk.console.log(`Affichage tab : ${tab_request}`);
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
    //sdk.console.log(`✅ Updated request ${req.id}`);
  });

  // Register API method to delete a request by ID
  sdk.api.register("deleteRequest", async (_sdk, id: string) => {
    //const db = await sdk.meta.db();
    const stmt = await db.prepare(`DELETE FROM requests WHERE id = ?`);
    await stmt.run(id);
  });
}

// Insert request data into database
async function insertRequest(db: Awaited<ReturnType<SDK["meta"]["db"]>>, sdk: SDK, req: CerebrumRequest) {
  const stmt = await db.prepare(`
    INSERT OR REPLACE INTO requests 
       (time, host, path, port, isTls, reqRaw, method, url, headers, body, status, reqLength, pending, note) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `);

  const result = await stmt.run(
    req.time,
    req.host,
    req.path,
    req.port,
    req.isTls ? 1 : 0,
    req.reqRaw,
    req.method ?? "",
    req.url && req.url !== "" ? req.url : rebuildUrl(req),
    JSON.stringify(req.headers && req.headers.length > 0 ? req.headers : parseHeaders(req.reqRaw)),
    req.body ?? "",
    req.status,
    req.reqLength,
    "Not touched",
    "Empty"
  );

  //sdk.console.log(`🧾 Inserted request: ${result.lastInsertRowid}`);
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
  "new-request": (cerebrumRequest: CerebrumRequest) => void;
}>;


// Frontend payload type when saving a request
export type CerebrumRequest = {
  time: string;
  host: string;
  path: string;
  port: number;
  isTls: boolean;
  reqRaw: string;
  method: string;
  url: string;
  headers: { name: string; value: string }[];
  body: string;
  status: string;
  reqLength: number;
};

// Internal database row structure
type DBRow = {
  id: string;
  time: string;
  host: string;
  path: string;
  port: number;
  isTls: number;
  reqRaw: string;
  method: string;
  url: string;
  headers: string; // stocké en JSON
  body: string;
  status: string;
  reqLength: number;
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
  url: string;
  headers: { name: string; value: string }[];
  body: string;
  status: string;
  reqLength: number;
  pending: string;
  note: string;
};

function rebuildUrl(req: CerebrumRequest): string {
  // Essaie de récupérer le path et query depuis reqRaw
  const raw = req.reqRaw;
  const match = raw.match(/^[A-Z]+\s+([^\s]+)\s+/);

  let pathAndQuery = req.path;

  if (match && match[1]) {
    pathAndQuery = match[1];
  }

  return `${req.isTls ? "https" : "http"}://${req.host}${pathAndQuery}`;
}

function parseHeaders(raw: string): { name: string; value: string }[] {
  const lines = raw.split("\r\n");
  // Ignore request line (GET / HTTP/1.1)
  const headerLines = lines.slice(1).filter(line => line.trim() !== "");

  const headers: { name: string; value: string }[] = [];

  for (const line of headerLines) {
    const idx = line.indexOf(":");
    if (idx > -1) {
      const name = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      headers.push({ name, value });
    }
  }

  return headers;
}