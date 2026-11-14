"use client";

import { createContext, ReactNode, useContext } from "react";

type SyncAccess = {
  syncEnabled: boolean;
  billingHref: string | null;
};

/*
 *   Whether the business's plan includes sync. Set once by the location
 *   dashboard layout and read by IsSyncedCheckbox, so the forms that use it
 *   don't each need to know the plan.
 *
 *   Outside a provider, sync shows as available (the server still enforces it).
 **/
const SyncAccessContext = createContext<SyncAccess>({
  syncEnabled: true,
  billingHref: null,
});

export function SyncAccessProvider({
  syncEnabled,
  billingHref,
  children,
}: SyncAccess & { children: ReactNode }) {
  return (
    <SyncAccessContext.Provider value={{ syncEnabled, billingHref }}>
      {children}
    </SyncAccessContext.Provider>
  );
}

export function useSyncAccess() {
  return useContext(SyncAccessContext);
}
