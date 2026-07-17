"use client";

import { cn } from "@heroui/react";

type BrandMarkProps = {
  size?: number;
  className?: string;
  /** square mark with soft bg for nav tiles */
  framed?: boolean;
};

/** GhostKeys ghost mascot mark (SVG logo). */
export function BrandMark({ size = 40, className, framed = false }: BrandMarkProps) {
  if (framed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-medium bg-primary-50",
          className
        )}
        style={{ width: size, height: size }}
      >
        <img
          src="/logo.svg"
          alt="GhostKeys"
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <img
      src="/favicon.svg"
      alt="GhostKeys"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}
