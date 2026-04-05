import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import type { Caido } from "@caido/sdk-frontend";
import type { BackendAPI, BackendEvents } from "backend";
import { SDKProvider, useSDK } from "./plugins/sdk";
import Organizer from "./Organizer";
import type { CommandContext } from "@caido/sdk-frontend/src/types";
import type { CerebrumEntry } from "../../backend/src/index";

export type CaidoSDK = Caido<BackendAPI, BackendEvents>;

/**
 * App wrapper for top-level data loading
 */
function App() {
  const sdk = useSDK();
  const [allRequests, setAllRequests] = useState<CerebrumEntry[]>([]);

  // Initial load only
  useEffect(() => {
    // initial load
    sdk.backend.getAllRequests().then(setAllRequests);

    // reload when the page becomes active again
    const handler = () => {
      sdk.backend.getAllRequests().then(setAllRequests);
    };
    window.addEventListener("organizer:page-show", handler);
    return () => window.removeEventListener("organizer:page-show", handler);
  }, [sdk.backend]);

  return <Organizer initialRequests={allRequests} />;
} 

export function init(caido: CaidoSDK) {
  // --- Setup main UI ---
  const rootEl = document.createElement("div");
  rootEl.id = "plugin--organizer";
  Object.assign(rootEl.style, { width: "100%", height: "100%" });

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <SDKProvider sdk={caido}>
        <App />
      </SDKProvider>
    </React.StrictMode>
  );

  caido.navigation.addPage("/organizer", { body: rootEl });
  const sidebarItem = caido.sidebar.registerItem("Organizer", "/organizer", {
    icon: "fas fa-folder-open",
  });

  // --- Helper to parse headers from raw request ---
  function parseHeaders(raw: string) {
    const lines = raw.split(/\r?\n/);
    const headerLines = lines.slice(1).filter((l) => l.includes(":"));
    const headers: { name: string; value: string }[] = [];
    for (const line of headerLines) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const name = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        headers.push({ name, value });
      }
    }
    return headers;
  }

  // --- Command 1: right-click on a table row (RequestRowContext) ---
  caido.commands.register("organizer:send-to-organizer-row", {
    name: "Send to Organizer (Table)",
    run: async (context: CommandContext) => {
      if (context.type !== "RequestRowContext") {
        console.log("[Organizer] Wrong context type:", context.type);
        return;
      }
      const entries = (context as any).requestEntry || (context as any).requests || [];
      if (!Array.isArray(entries) || entries.length === 0) {
        caido.window.showToast("No requests selected", { duration: 3000 });
        return;
      }
      const slice = entries.slice(0, 10);
      for (const r of slice) {
        try {
          // Fetch request data including nested response
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
                response {
                  id
                  statusCode
                }
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
              response?: {
                id: string;
                statusCode?: number;
              };
            };
          };

          const req = gql.request;
          if (!req || !req.raw) {
            caido.window.showToast("Missing raw request", { duration: 3000 });
            continue;
          }

          let responseRaw = "";
          if (req.response?.id) {
            try {
              const resGql = await caido.graphql.response({ id: req.response.id });
              responseRaw = resGql.response?.raw || `[DEBUG: Response empty]\\n\\nresGql Object:\\n${JSON.stringify(resGql, null, 2)}`;
            } catch (err: any) {
              responseRaw = `[DEBUG: Error]\\n\\n${err.toString()}`;
              console.error("[Organizer] Nested response fetch error:", err);
            }
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
            status:    statusStr,
            reqLength: req.length ?? 0,
            resRaw:    responseRaw,
            resLength: responseRaw.length,
          });

          window.dispatchEvent(new Event("organizer:new-request"));
        } catch (err) {
          console.error("[Organizer] Error processing request:", err);
          caido.window.showToast(`Error: ${err}`, { duration: 3000 });
        }
      }
      caido.window.showToast(`Sent ${slice.length} requests to Organizer`, {
        duration: 3000,
      });
    },
  });
  caido.menu.registerItem({
    type: "RequestRow",
    commandId: "organizer:send-to-organizer-row",
    leadingIcon: "fas fa-folder-open",
    // @ts-ignore - The SDK types omit 'label' but the Caido UI requires it to show the menu
    label: "Send to Organizer",
  });

  // --- Command 2: right-click in the editor (RequestContext or ResponseContext) ---
  caido.commands.register("organizer:send-to-organizer-editor", {
    name: "Send to Organizer (Editor)",
    run: async (context: CommandContext) => {
      if (context.type !== "RequestContext" && context.type !== "ResponseContext") return;

      const r = (context as any).request;
      let rawRequest = "";
      let rawResponse = "";
      let method = "";
      let finalUrl = "";
      let reqBody = "";
      let statusStr = "N/A";
      let time = new Date().toISOString();
      let fetchGqlSuccess = false;

      // If we have a request ID, we can fetch everything from GraphQL (Request + Response)
      if (r?.id) {
        try {
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
                response {
                  id
                  statusCode
                }
              }
            }
          `
          )) as any;

          const req = gql?.request;
          if (req && req.raw) {
            rawRequest = req.raw;
            method = req.method ?? "";
            finalUrl = req.url ?? "";
            reqBody = req.body ?? "";
            time = req.createdAt ?? time;
            
            if (req.response?.id) {
              const resGql = await caido.graphql.response({ id: req.response.id });
              rawResponse = resGql.response?.raw || "";
              statusStr = req.response.statusCode?.toString() || "N/A";
            }
            fetchGqlSuccess = true;
          }
        } catch (err) {
          console.error("[Organizer] Failed to fetch GraphQL for editor context", err);
        }
      }

      // If GraphQL failed or there's no ID (e.g., unsent request in Replay), fallback to data available in context
      if (!fetchGqlSuccess) {
        if (context.type === "RequestContext") {
          rawRequest = r?.raw || "";
        } else if (context.type === "ResponseContext") {
          const res = (context as any).response;
          rawResponse = res?.raw || "";
          statusStr = res?.statusCode?.toString() || "N/A";
        }

        if (rawRequest) {
          const lines = rawRequest.split(/\r?\n/);
          const firstLine = lines[0] ?? "";
          const [parsedMethod = "", rawPath = r?.path || ""] = firstLine.split(" ");
          method = parsedMethod;
          finalUrl = `${r?.isTls ? "https" : "http"}://${r?.host || ""}${
            (rawPath || "").startsWith("/") ? rawPath : `/${rawPath || ""}`
          }`;
          
          const parts = rawRequest.split(/\r?\n\r?\n/);
          reqBody = parts.length > 1 ? parts.slice(1).join("\r\n\r\n") : "";
        }
      }

      if (!rawRequest && !rawResponse) {
        caido.window.showToast("No HTTP data available in editor", { duration: 3000 });
        return;
      }

      await caido.backend.saveRequest({
        time:      time,
        host:      r?.host || "",
        port:      r?.port || 0,
        path:      r?.path || "/",
        isTls:     r?.isTls || false,
        reqRaw:    rawRequest,
        method:    method,
        url:       finalUrl || `${r?.isTls ? "https" : "http"}://${r?.host || ""}${r?.path || "/"}`,
        headers:   rawRequest ? parseHeaders(rawRequest) : [],
        body:      reqBody,
        status:    statusStr,
        reqLength: rawRequest.length,
        resRaw:    rawResponse,
        resLength: rawResponse.length,
      });

      window.dispatchEvent(new Event("organizer:new-request"));
      caido.window.showToast(`Sent 1 request to Organizer`, { duration: 3000 });
    },
  });
  
  caido.menu.registerItem({
    type: "Request",
    commandId: "organizer:send-to-organizer-editor",
    leadingIcon: "fas fa-folder-open",
  });

  caido.menu.registerItem({
    type: "Response",
    commandId: "organizer:send-to-organizer-editor",
    leadingIcon: "fas fa-folder-open",
  });


  let badgeCount = 0;
  sidebarItem.setCount(0);
  
  window.addEventListener("organizer:new-request", () => {
    badgeCount += 1;
    sidebarItem.setCount(badgeCount);
  });

  window.addEventListener("organizer:clear-badge", () => {
    badgeCount = 0; 
    sidebarItem.setCount(0);
  });
}


