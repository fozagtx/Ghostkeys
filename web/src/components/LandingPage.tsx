"use client";

import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import ActionCard from "./ActionCard";
import { BrandMark } from "./BrandMark";
import { ConnectButton } from "./ConnectButton";
import { useWallet } from "../lib/wallet";
import { getActiveChain } from "../lib/chain";

/**
 * Marketing landing: shown until the wallet is connected.
 */
export function LandingPage() {
  const { connect, connecting } = useWallet();
  const chain = getActiveChain();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-large border border-default-200 bg-content1 px-4 py-3 shadow-small">
        <div className="flex items-center gap-3">
          <BrandMark size={40} framed />
          <p className="text-medium font-semibold text-default-900">GhostKeys</p>
        </div>
        <ConnectButton />
      </header>

      <section className="flex flex-col items-center gap-8 rounded-large border border-default-200 bg-content1 px-6 py-10 shadow-small sm:flex-row sm:items-center sm:px-10 sm:py-14">
        <div className="flex shrink-0 justify-center">
          <img
            src="/ghost-mascot.jpg"
            alt="GhostKeys mascot"
            width={168}
            height={168}
            className="h-36 w-36 rounded-full object-cover shadow-small ring-2 ring-primary-100 sm:h-44 sm:w-44"
          />
        </div>
        <div className="flex flex-1 flex-col items-start gap-6">
          <div className="flex flex-wrap gap-2">
            <Chip size="sm" color="primary" variant="flat">
              On Monad
            </Chip>
            <Chip size="sm" variant="flat">
              Wallet-backed 2FA
            </Chip>
          </div>
          <div className="flex max-w-xl flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-default-900 sm:text-4xl sm:leading-[1.15]">
              Reaching for your phone for an auth code should never spoil deep work.
            </h1>
            <p className="text-medium leading-relaxed text-default-500">
              Let it live in your wallet. Connect on any device, copy the code,
              keep going.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              color="primary"
              radius="full"
              size="lg"
              isLoading={connecting}
              startContent={
                !connecting ? (
                  <Icon icon="solar:wallet-bold-duotone" width={20} />
                ) : undefined
              }
              onPress={() => void connect()}
            >
              {connecting ? "Connecting…" : "Get started"}
            </Button>
            <Button
              as="a"
              href="#how"
              variant="bordered"
              radius="full"
              size="lg"
            >
              How it works
            </Button>
          </div>
        </div>
      </section>

      <section id="how" className="flex flex-col gap-4">
        <div>
          <p className="text-large font-medium text-default-900">Why GhostKeys</p>
          <p className="text-small text-default-500">
            Codes where you work. Not buried in another device.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            color="primary"
            icon="solar:laptop-bold-duotone"
            title="Stay at the keyboard"
            description="Need a code? Copy it here without leaving your keyboard."
          />
          <ActionCard
            color="secondary"
            icon="solar:wallet-bold-duotone"
            title="Tied to your wallet"
            description="New laptop or new phone. Same wallet, same codes."
          />
          <ActionCard
            icon="solar:lock-keyhole-bold-duotone"
            title="Only you open it"
            description="One signature to unlock. Not a payment. Not gas."
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            n: "1",
            title: "Connect",
            body: `Wallet on ${chain.name}.`,
            icon: "solar:wallet-bold-duotone",
          },
          {
            n: "2",
            title: "Sign once",
            body: "Free signature to open your codes.",
            icon: "solar:key-bold-duotone",
          },
          {
            n: "3",
            title: "Copy & go",
            body: "Add accounts once. Codes when you need them.",
            icon: "solar:copy-bold-duotone",
          },
        ].map((s) => (
          <Card
            key={s.n}
            className="border-small border-default-200"
            shadow="sm"
          >
            <CardBody className="flex flex-row items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-tiny font-semibold text-primary-foreground">
                {s.n}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Icon className="text-primary" icon={s.icon} width={18} />
                  <p className="text-medium font-medium">{s.title}</p>
                </div>
                <p className="text-small text-default-500">{s.body}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </section>

      <footer className="pb-8 text-center text-tiny text-default-400">
        GhostKeys · {chain.name}
      </footer>
    </div>
  );
}
