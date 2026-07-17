"use client";

import { Providers } from "./Providers";
import { LandingPage } from "./LandingPage";
import { VaultInner } from "./VaultApp";
import { useWallet } from "../lib/wallet";

function HomeShell() {
  const { isConnected } = useWallet();
  return isConnected ? <VaultInner /> : <LandingPage />;
}

/** Single-page shell: landing until wallet connects, then the app. */
export function HomeApp() {
  return (
    <Providers>
      <HomeShell />
    </Providers>
  );
}
