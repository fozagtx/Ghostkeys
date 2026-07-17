"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Progress,
  cn,
} from "@heroui/react";
import { Icon } from "@iconify/react";

export type SecretCodeCardProps = {
  service: string;
  account: string;
  token: string;
  remaining: number;
  period?: number;
  disabledDelete?: boolean;
  onCopy?: () => void;
  onDelete?: () => void;
  className?: string;
};

/** Mask account/email: keep a little shape, hide the rest until revealed. */
function maskAccount(value: string): string {
  const s = value.trim();
  if (!s) return "••••••••";

  if (s.includes("@")) {
    const [local, domain = ""] = s.split("@");
    const maskPart = (part: string) => {
      if (part.length <= 1) return "•";
      if (part.length === 2) return `${part[0]}•`;
      return `${part[0]}${"•".repeat(Math.min(part.length - 2, 8))}${part[part.length - 1]}`;
    };
    if (!domain) return maskPart(local);
    const dots = domain.split(".");
    if (dots.length >= 2) {
      const tld = dots.pop()!;
      const name = dots.join(".");
      return `${maskPart(local)}@${maskPart(name)}.${tld}`;
    }
    return `${maskPart(local)}@${maskPart(domain)}`;
  }

  if (s.length <= 2) return "•".repeat(s.length);
  return `${s[0]}${"•".repeat(Math.min(s.length - 2, 10))}${s[s.length - 1]}`;
}

/** OTP code row: dense list card for sidebar app layout */
const SecretCodeCard = React.forwardRef<HTMLDivElement, SecretCodeCardProps>(
  (
    {
      service,
      account,
      token,
      remaining,
      period = 30,
      disabledDelete,
      onCopy,
      onDelete,
      className,
    },
    ref
  ) => {
    const [showAccount, setShowAccount] = useState(false);
    const pct = Math.max(0, Math.min(100, (remaining / period) * 100));
    const urgent = remaining <= 5;
    const pretty =
      token.length === 6
        ? `${token.slice(0, 3)} ${token.slice(3)}`
        : token;
    const accountDisplay = showAccount ? account : maskAccount(account);

    return (
      <Card
        ref={ref}
        className={cn("border-small border-default-200 bg-content1", className)}
        shadow="sm"
      >
        <CardBody className="gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex shrink-0 rounded-medium border border-primary-100 bg-primary-50 p-2">
              <Icon
                className="text-primary"
                icon="solar:shield-keyhole-bold-duotone"
                width={20}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-medium font-medium text-default-900">
                    {service}
                  </p>
                  <div className="flex min-w-0 items-center gap-1">
                    <p
                      className={cn(
                        "min-w-0 truncate text-small text-default-500",
                        !showAccount && "tracking-wide"
                      )}
                      title={showAccount ? account : "Hidden"}
                    >
                      {accountDisplay}
                    </p>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      radius="full"
                      className="h-6 w-6 min-w-6 shrink-0 text-default-400"
                      aria-label={
                        showAccount ? "Hide account" : "Show account"
                      }
                      onPress={() => setShowAccount((v) => !v)}
                    >
                      <Icon
                        icon={
                          showAccount
                            ? "solar:eye-closed-linear"
                            : "solar:eye-linear"
                        }
                        width={16}
                      />
                    </Button>
                  </div>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  color={urgent ? "warning" : "default"}
                  className="shrink-0 tabular-nums"
                >
                  {remaining}s
                </Chip>
              </div>

              <button
                type="button"
                className={cn(
                  "mt-2 block w-full text-left font-mono text-2xl font-semibold tracking-[0.2em] transition-colors sm:text-[1.65rem]",
                  urgent ? "text-warning" : "text-primary"
                )}
                onClick={onCopy}
                title="Copy code"
              >
                {pretty}
              </button>
            </div>
          </div>

          <Progress
            aria-label="Code validity"
            size="sm"
            value={pct}
            color={urgent ? "warning" : "primary"}
            className="max-w-full"
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              radius="full"
              color="primary"
              variant="flat"
              className="flex-1"
              startContent={<Icon icon="solar:copy-linear" width={16} />}
              onPress={onCopy}
            >
              Copy
            </Button>
            <Button
              size="sm"
              radius="full"
              color="danger"
              variant="light"
              isDisabled={disabledDelete}
              startContent={
                <Icon icon="solar:trash-bin-trash-linear" width={16} />
              }
              onPress={onDelete}
            >
              Delete
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }
);

SecretCodeCard.displayName = "SecretCodeCard";

export default SecretCodeCard;
