// packages/backend/src/index.ts
async function init(sdk) {
  const db = await sdk.meta.db();
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
  sdk.api.register("saveRequest", async (_sdk, req) => {
    try {
      await insertRequest(db, sdk, req);
    } catch (e) {
    }
    return "OK";
  });
  sdk.api.register("getAllRequests", async () => {
    const stmt = await db.prepare("SELECT * FROM requests");
    const rows = await stmt.all();
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
    return tab_request;
  });
  sdk.api.register("updateRequest", async (_sdk, req) => {
    const stmt = await db.prepare(`
      UPDATE requests
      SET note = ?, pending = ?
      WHERE id = ?
    `);
    await stmt.run(req.note, req.pending, req.id);
  });
  sdk.api.register("deleteRequest", async (_sdk, id) => {
    const db2 = await sdk.meta.db();
    const stmt = await db2.prepare(`DELETE FROM requests WHERE id = ?`);
    await stmt.run(id);
  });
}
async function insertRequest(db, sdk, req) {
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
}
function extractMethod(raw) {
  return raw.split(" ")[0] || "UNKNOWN";
}
export {
  init
};
