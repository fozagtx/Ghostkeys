"use client";

import type { ReactNode } from "react";
import { HeroUIProvider } from "@heroui/react";
import { WalletProvider } from "../lib/wallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <HeroUIProvider>
      <WalletProvider>{children}</WalletProvider>
    </HeroUIProvider>
  );
}
