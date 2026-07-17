"use client";

import React from "react";
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

/** OTP code row: HeroUI card + progress (design-promax tokens) */
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
    const pct = Math.max(0, Math.min(100, (remaining / period) * 100));
    const urgent = remaining <= 5;

    return (
      <Card
        ref={ref}
        className={cn("border-small border-default-200", className)}
        shadow="sm"
      >
        <CardBody className="gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex rounded-medium border border-primary-100 bg-primary-50 p-2">
                <Icon
                  className="text-primary"
                  icon="solar:shield-keyhole-bold-duotone"
                  width={22}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-medium font-medium text-default-900">
                  {service}
                </p>
                <p className="truncate text-small text-default-500">{account}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                className={cn(
                  "font-mono text-2xl font-semibold tracking-[0.18em] transition-colors",
                  urgent ? "text-warning" : "text-primary"
                )}
                onClick={onCopy}
                title="Copy code"
              >
                {token}
              </button>
              <Chip
                size="sm"
                variant="flat"
                color={urgent ? "warning" : "default"}
                className="text-tiny"
              >
                {remaining}s left
              </Chip>
            </div>
          </div>
          <Progress
            aria-label="Code validity"
            size="sm"
            value={pct}
            color={urgent ? "warning" : "primary"}
            className="max-w-full"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              radius="full"
              variant="bordered"
              startContent={<Icon icon="solar:copy-linear" width={16} />}
              onPress={onCopy}
            >
              Copy
            </Button>
            <Button
              size="sm"
              radius="full"
              color="danger"
              variant="flat"
              isDisabled={disabledDelete}
              startContent={<Icon icon="solar:trash-bin-trash-linear" width={16} />}
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
