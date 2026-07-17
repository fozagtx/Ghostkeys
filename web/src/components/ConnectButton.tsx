"use client";

import { Button, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useWallet } from "../lib/wallet";
import { getActiveChain } from "../lib/chain";

export function ConnectButton() {
  const {
    address,
    isConnected,
    connecting,
    wrongNetwork,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();
  const chain = getActiveChain();

  if (!isConnected) {
    return (
      <Button
        color="primary"
        radius="full"
        isLoading={connecting}
        startContent={
          !connecting ? (
            <Icon icon="solar:wallet-bold-duotone" width={18} />
          ) : undefined
        }
        onPress={() => void connect()}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {wrongNetwork ? (
        <Button
          color="warning"
          variant="flat"
          radius="full"
          size="sm"
          startContent={<Icon icon="solar:danger-triangle-bold" width={16} />}
          onPress={() => void switchNetwork()}
        >
          Switch to {chain.name}
        </Button>
      ) : (
        <Chip size="sm" variant="flat" color="success" className="hidden sm:flex">
          {chain.name}
        </Chip>
      )}
      <Chip
        size="sm"
        variant="bordered"
        className="font-mono"
        startContent={<Icon icon="solar:user-circle-bold-duotone" width={16} />}
      >
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </Chip>
      <Button size="sm" variant="light" radius="full" onPress={disconnect}>
        Disconnect
      </Button>
    </div>
  );
}
