"use client";

import { Button, Chip, cn } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useWallet } from "../lib/wallet";
import { getActiveChain } from "../lib/chain";

type ConnectButtonProps = {
  /** Stacked controls for narrow sidebars */
  compact?: boolean;
  className?: string;
};

export function ConnectButton({ compact = false, className }: ConnectButtonProps) {
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
  const short = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  if (!isConnected) {
    return (
      <Button
        color="primary"
        radius="full"
        className={cn(compact && "w-full", className)}
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

  if (compact) {
    return (
      <div className={cn("flex w-full flex-col gap-2", className)}>
        {wrongNetwork ? (
          <Button
            color="warning"
            variant="flat"
            radius="full"
            size="sm"
            className="w-full"
            startContent={<Icon icon="solar:danger-triangle-bold" width={16} />}
            onPress={() => void switchNetwork()}
          >
            Switch network
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 px-0.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            <span className="truncate text-tiny text-default-500">{chain.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-medium border border-default-200 bg-content1 px-2.5 py-2">
          <Icon
            className="shrink-0 text-default-400"
            icon="solar:user-circle-bold-duotone"
            width={18}
          />
          <span className="min-w-0 flex-1 truncate font-mono text-tiny text-default-700">
            {short}
          </span>
        </div>
        <Button
          size="sm"
          variant="flat"
          radius="full"
          className="w-full"
          startContent={<Icon icon="solar:logout-2-linear" width={16} />}
          onPress={disconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
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
        {short}
      </Chip>
      <Button size="sm" variant="light" radius="full" onPress={disconnect}>
        Disconnect
      </Button>
    </div>
  );
}
