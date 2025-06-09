import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import App from "./views/App.vue";

import "./styles/index.css";
import type { BackendAPI } from "../../backend/src/index";
export type CaidoSDK = Caido<BackendAPI, {}>;

import { SDKPlugin } from "./plugins/sdk";
import { CommandContext } from "@caido/sdk-frontend/src/types";
import { Caido } from "@caido/sdk-frontend";

// This is the entry point for the Caido frontend plugin
export const init = (caido: CaidoSDK) => {
  const app = createApp(App);

  // Register the PrimeVue component library with the Classic preset (unstyled + Prime tokens)
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  // Provide the Caido SDK to the app via a Vue plugin
  app.use(SDKPlugin, caido);

  // Create a root DOM element for the plugin UI
  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  // Set a unique ID to avoid style conflicts between plugins
  root.id = `plugin--cerebrum`;

  // Mount the Vue app to the created root element
  app.mount(root);

  // Register a custom page in the Caido UI, accessible via navigation
  caido.navigation.addPage("/cerebrum", {
    body: root,
  });

  // Add a sidebar item to access the plugin
  caido.sidebar.registerItem("Cerebrum", "/cerebrum", {
    icon: "fas fa-brain",
  });

  // Register a command that will be used by right-click or programmatically
  caido.commands.register("send-to-cerebrum", {
    name: "Send to Cerebrum",
    run: (context) => {
      return sendToCerebrum(caido, context);
    },
  });

  // Add the command to right-click menus for both full request views and table rows
  caido.menu.registerItem({
    type: "Request",
    commandId: "send-to-cerebrum",
    leadingIcon: "fas fa-brain",
  });

  caido.menu.registerItem({
    type: "RequestRow",
    commandId: "send-to-cerebrum",
    leadingIcon: "fas fa-brain",
  });
};

// This command extracts request data using GraphQL and saves it to the plugin backend
export const sendToCerebrum = async (
  sdk: CaidoSDK,
  context: CommandContext
) => {
  if (context.type === "RequestRowContext") {
    // Limit to first 10 requests for performance
    const requests = context.requests.slice(0, 10);
    console.log("📤 Selected requests:", requests);

    for (const r of requests) {
      // Query detailed request data using GraphQL
      const gql = await sdk.graphql.request(
        { id: r.id },
        `
          query ($id: ID!) {
            request(id: $id) {
              host
              port
              path
              length
              raw
              createdAt
              response {
                statusCode
                length
                createdAt
              }
            }
          }
        `
      ) as unknown as {
        request: {
          host: string;
          port?: number;
          path: string;
          length?: number;
          raw: string;
          createdAt?: string;
          response?: {
            statusCode?: number;
            length?: number;
            createdAt?: string;
          };
        };
      };

      // Extract fields from the response
      const host = gql.request.host;
      const port = gql.request.port ?? 0;
      const path = gql.request.path;
      const reqRaw = gql.request.raw;
      const statusCode = gql.request.response?.statusCode ?? -1;
      const lengthReq = gql.request.length ?? 0;
      const lengthResp = gql.request.response?.length ?? 0;
      const requestTime = gql.request.createdAt ?? "<no timestamp>";

      // Log for debugging
      console.log("📥 Request raw:", reqRaw);
      console.log("📤 Time:", requestTime);
      console.log("📤 Status:", statusCode);
      console.log("📤 Resp Length:", lengthResp);
      console.log("📤 Req Length:", lengthReq);

      // Skip if no raw request is available
      if (!reqRaw) {
        sdk.window.showToast("Missing raw request", { duration: 3000 });
        continue;
      }

      // Save the request to the backend (custom API)
      await sdk.backend.saveRequest({
        time: requestTime,
        host: host,
        path: path,
        port: port,
        isTls: r.isTls,
        reqRaw: reqRaw,
        status: statusCode,
        reqLength: lengthReq,
        respLength: lengthResp,
      });

      // Log full result for inspection
      console.log("🧾 GraphQL response:", JSON.stringify(gql, null, 2));
    }

    // Show a success message
    sdk.window.showToast(`Sent ${requests.length} requests to Cerebrum`, {
      duration: 3000,
    });
  }
};
