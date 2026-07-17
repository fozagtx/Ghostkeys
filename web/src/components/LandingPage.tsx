"use client";

import { Button, Card, CardBody, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import ActionCard from "./ActionCard";
import { BrandMark } from "./BrandMark";

/**
 * Marketing landing: clean_product / marketing_campaign feel.
 * Hero first; closes with a strong bottom CTA (end hero).
 */
export function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
      {/* Nav */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-large border border-default-200 bg-content1 px-4 py-3 shadow-small">
        <div className="flex items-center gap-3">
          <BrandMark size={40} framed />
          <p className="text-medium font-semibold text-default-900">GhostKeys</p>
        </div>
        <Button
          as="a"
          href="/app"
          color="primary"
          radius="full"
          startContent={<Icon icon="solar:arrow-right-bold" width={18} />}
        >
          Get started
        </Button>
      </header>

      {/* Hero */}
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
              Any device
            </Chip>
            <Chip size="sm" variant="flat">
              Your wallet unlocks it
            </Chip>
          </div>
          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-default-900 sm:text-4xl sm:leading-tight">
              Your authenticator, tied to your wallet, not your phone.
            </h1>
            <p className="text-medium text-default-500">
              Save 2FA accounts once. Open them on any laptop or phone by connecting the same wallet.
              Codes stay with you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              as="a"
              href="/app"
              color="primary"
              radius="full"
              size="lg"
              startContent={<Icon icon="solar:wallet-bold-duotone" width={20} />}
            >
              Open GhostKeys
            </Button>
            <Button
              as="a"
              href="#how"
              variant="bordered"
              radius="full"
              size="lg"
              startContent={<Icon icon="solar:info-circle-linear" width={20} />}
            >
              How it works
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how" className="flex flex-col gap-4">
        <div>
          <p className="text-large font-medium text-default-900">Why GhostKeys</p>
          <p className="text-small text-default-500">
            Keep your 2FA with your wallet so a lost phone does not lock you out.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            color="primary"
            icon="solar:lock-keyhole-bold-duotone"
            title="Locked to you"
            description="Only your wallet can unlock your codes."
          />
          <ActionCard
            color="secondary"
            icon="solar:cloud-storage-bold-duotone"
            title="Survives a new phone"
            description="Accounts live with your wallet, not one device."
          />
          <ActionCard
            icon="solar:smartphone-2-bold-duotone"
            title="Works anywhere"
            description="Connect, unlock, copy the code. Done."
          />
        </div>
      </section>

      {/* Simple steps */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            n: "1",
            title: "Connect",
            body: "Use your wallet on Monad Testnet.",
            icon: "solar:wallet-bold-duotone",
          },
          {
            n: "2",
            title: "Unlock",
            body: "One signature. Not a payment.",
            icon: "solar:key-bold-duotone",
          },
          {
            n: "3",
            title: "Add codes",
            body: "Paste a secret, store it, copy OTPs.",
            icon: "solar:shield-check-bold-duotone",
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

      {/* End hero / closing CTA */}
      <section className="flex flex-col items-center gap-5 rounded-large border border-primary-100 bg-primary-50/60 px-6 py-12 text-center shadow-small sm:px-12">
        <img
          src="/ghost-mascot.jpg"
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 rounded-full object-cover shadow-small ring-2 ring-primary-100"
        />
        <div className="flex max-w-lg flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-default-900 sm:text-3xl">
            Ready when you are.
          </h2>
          <p className="text-small text-default-500 sm:text-medium">
            Open GhostKeys, connect your wallet, and add your first authenticator in under a minute.
          </p>
        </div>
        <Button
          as="a"
          href="/app"
          color="primary"
          radius="full"
          size="lg"
          startContent={<Icon icon="solar:arrow-right-bold" width={20} />}
        >
            Enter GhostKeys
        </Button>
      </section>

      <footer className="pb-8 text-center text-tiny text-default-400">
        GhostKeys · Monad Testnet
      </footer>
    </div>
  );
}
