import React, { createContext, useContext, ReactNode } from "react";
import type { CaidoSDK } from "../index";

// Create a Context for the Caido SDK
type SDKContextType = CaidoSDK | null;
const SDKContext = createContext<SDKContextType>(null);

// Provider component to wrap the app and supply the SDK instance
type SDKProviderProps = {
  sdk: CaidoSDK;
  children: ReactNode;
};
export function SDKProvider({ sdk, children }: SDKProviderProps) {
  return <SDKContext.Provider value={sdk}>{children}</SDKContext.Provider>;
}

// Hook to access the SDK from any component
export function useSDK(): CaidoSDK {
  const sdk = useContext(SDKContext);
  if (!sdk) {
    throw new Error("useSDK must be used within an SDKProvider");
  }
  return sdk;
}
