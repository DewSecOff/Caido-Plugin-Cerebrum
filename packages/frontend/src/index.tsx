import React from "react";
import ReactDOM from "react-dom/client";
import type { Caido } from "@caido/sdk-frontend";
import type { BackendAPI, BackendEvents } from "backend";
import { SDKProvider, useSDK } from "./plugins/sdk";
import Cerebrum from "./Cerebrum";
import type { CommandContext } from "@caido/sdk-frontend/src/types";

export type CaidoSDK = Caido<BackendAPI, BackendEvents>;

export function init(caido: CaidoSDK) {
  // --- Setup de votre UI principal ---
  const rootEl = document.createElement("div");
  rootEl.id = "plugin--cerebrum";
  Object.assign(rootEl.style, { width: "100%", height: "100%" });

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <SDKProvider sdk={caido}>
        <Cerebrum />
      </SDKProvider>
    </React.StrictMode>
  );

  caido.navigation.addPage("/cerebrum", { body: rootEl });
  const sidebarItem = caido.sidebar.registerItem("Cerebrum", "/cerebrum", {
    icon: "fas fa-brain",
  });

  // --- Helper pour parser les headers depuis le raw ---
function parseHeaders(raw: string) {
  const lines = raw.split(/\r?\n/);
  const headerLines = lines.slice(1).filter((l) => l.includes(":"));
  const headers: { name: string; value: string }[] = [];
  for (const line of headerLines) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      // ici name pouvait être undefined selon TS
      const name = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      headers.push({ name, value });
    }
  }
  return headers;
}

  // --- Commande 1: clic droit sur une ligne du tableau (RequestRowContext) ---
  caido.commands.register("send-to-cerebrum-row", {
    name: "Send to Cerebrum (Table)",
    run: async (context: CommandContext) => {
      if (context.type !== "RequestRowContext") return;
      const slice = context.requests.slice(0, 10);
      for (const r of slice) {
        // On fetche tout via GraphQL
        const gql = (await caido.graphql.request(
          { id: r.id },
          `
          query ($id: ID!) {
            request(id: $id) {
              method
              url
              headers { name value }
              body
              host
              port
              path
              length
              raw
              createdAt
              response { statusCode }
            }
          }
        `
        )) as unknown as {
          request: {
            method: string;
            url: string;
            headers: { name: string; value: string }[];
            body?: string;
            host: string;
            port?: number;
            path: string;
            length?: number;
            raw: string;
            createdAt?: string;
            response?: { statusCode?: number };
          };
        };

        const req = gql.request;
        if (!req.raw) {
          caido.window.showToast("Missing raw request", { duration: 3000 });
          continue;
        }

        const statusStr =
          req.response?.statusCode != null
            ? req.response.statusCode.toString()
            : "N/A";

        await caido.backend.saveRequest({
          time:      req.createdAt ?? new Date().toISOString(),
          host:      req.host,
          port:      req.port ?? 0,
          path:      req.path,
          isTls:     r.isTls,
          reqRaw:    req.raw,
          method:    req.method ?? "",
          url:       req.url ?? "",
          headers:   req.headers || [],
          body:      req.body ?? "",
          status:    statusStr,    // toujours string
          reqLength: req.length ?? 0,
        });

        window.dispatchEvent(new Event("cerebrum:new-request"));
      }
      caido.window.showToast(`Sent ${slice.length} requests to Cerebrum`, {
        duration: 3000,
      });
    },
  });
  caido.menu.registerItem({
    type: "RequestRow",
    commandId: "send-to-cerebrum-row",
    leadingIcon: "fas fa-brain",
  });

  // --- Commande 2: clic droit dans l’éditeur (RequestContext) ---
  caido.commands.register("send-to-cerebrum-editor", {
    name: "Send to Cerebrum (Editor)",
    run: async (context: CommandContext) => {
      if (context.type !== "RequestContext") return;
      const r = context.request;
      const raw = r.raw;
      if (!raw) {
        caido.window.showToast("No raw HTTP in editor", { duration: 3000 });
        return;
      }

      // Ligne de requête
      const lines = raw.split(/\r?\n/);
      const firstLine = lines[0] ?? "";
      const [method = "", rawPath = r.path] = firstLine.split(" ");

      // Reconstruction de l’URL
      const url = `${r.isTls ? "https" : "http"}://${r.host}${
        rawPath.startsWith("/") ? rawPath : `/${rawPath}`
      }`;

      // Corps (après la ligne vide)
      const parts = raw.split(/\r?\n\r?\n/);
      const body = parts.length > 1 ? parts.slice(1).join("\r\n\r\n") : "";

      const statusStr = "N/A";

      await caido.backend.saveRequest({
        time:      new Date().toISOString(),
        host:      r.host,
        port:      r.port,
        path:      r.path,
        isTls:     r.isTls,
        reqRaw:    raw,
        method:    method,
        url:       url,
        headers:   parseHeaders(raw),
        body:      body,
        status:    statusStr,
        reqLength: raw.length,
      });

      window.dispatchEvent(new Event("cerebrum:new-request"));
      caido.window.showToast(`Sent 1 request to Cerebrum`, { duration: 3000 });
    },
  });
  caido.menu.registerItem({
    type: "Request",
    commandId: "send-to-cerebrum-editor",
    leadingIcon: "fas fa-brain",
  });


  let badgeCount = 0;
  sidebarItem.setCount(0);
  
    window.addEventListener("cerebrum:new-request", () => {
    badgeCount += 1;                           // incrément manuel
    sidebarItem.setCount(badgeCount); // passe un nombre
  });

window.addEventListener("cerebrum:clear-badge", () => {
  sidebarItem.setCount(0);
});
}


