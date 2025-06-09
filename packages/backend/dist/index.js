// packages/backend/src/index.ts
async function init(sdk) {
  console.log("\u{1F4E6} Cerebrum backend loaded");
  sdk.console.log("\u{1F4E6} Cerebrum backend loaded");
  const db = await sdk.meta.db();
  sdk.api.register("saveRequest", async (_sdk, req) => {
    try {
      await initDatabase(db, sdk, req);
      await dumpAllRequests(db, sdk);
    } catch (e) {
      sdk.console.log(`\u274C Failed to save request: ${e}`);
    }
    return "OK";
  });
  sdk.console.log("Database initialized.");
  sdk.api.register("getAllRequests", async () => {
    const db2 = await sdk.meta.db();
    const stmt = await db2.prepare("SELECT * FROM requests");
    const rows = await stmt.all();
    sdk.console.log(`\u{1F6A8} Raw rows from DB: ${rows}`);
    const tab_request = rows.map((row) => ({
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
      note: row.note
    }));
    sdk.console.log(`Affichage tab : ${tab_request}`);
    return tab_request;
  });
  sdk.api.register("updateRequest", async (_sdk, req) => {
    const stmt = await db.prepare(`
      UPDATE requests
      SET note = ?, pending = ?
      WHERE id = ?
    `);
    await stmt.run(req.note, req.pending, req.id);
    sdk.console.log(`\u2705 Updated request ${req.id}`);
  });
  sdk.api.register("deleteRequest", async (_sdk, id) => {
    const db2 = await sdk.meta.db();
    const stmt = await db2.prepare(`DELETE FROM requests WHERE id = ?`);
    await stmt.run(id);
  });
}
async function initDatabase(db, sdk, req) {
  try {
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
      "Not touched",
      // default pending
      "Empty"
      // default note
    );
    sdk.console.log(`Post run : ${result.lastInsertRowid}`);
    return db;
  } catch (error) {
    sdk.console.error(`Database initialization failed: ${error}`);
    throw error;
  }
}
async function dumpAllRequests(db, sdk) {
  try {
    const stmt = await db.prepare("SELECT * FROM requests");
    const rows = await stmt.all();
    sdk.console.log(`\u{1F4E4} Dumping ${rows.length} requests from DB:`);
    for (const row of rows) {
      sdk.console.log(
        `\u{1F9FE} [${row.id}] ${row.host}:${row.port} TLS=${!!row.isTls}
${row.reqRaw}
`
      );
    }
  } catch (error) {
    sdk.console.error(`\u274C Failed to dump requests: ${error}`);
  }
}
function extractMethod(raw) {
  return raw.split(" ")[0] || "UNKNOWN";
}
export {
  init
};
