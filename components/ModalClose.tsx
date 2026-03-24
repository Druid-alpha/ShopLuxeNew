"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Props = {
  fallbackHref: string;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
};

export default function ModalClose({ fallbackHref, className, ariaLabel, children }: Props) {
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  };

  return (
    <a href={fallbackHref} onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
