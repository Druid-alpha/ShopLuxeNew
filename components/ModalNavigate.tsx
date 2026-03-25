"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  href: string;
  className?: string;
  children?: React.ReactNode;
};

export default function ModalNavigate({ href, className, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const targetPath = href.split("?")[0];
    if (pathname === targetPath) {
      window.location.assign(href);
      return;
    }
    router.replace(href);
    router.refresh();
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
