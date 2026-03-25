"use client";

import * as React from "react";

type Props = {
  href: string;
  className?: string;
  children?: React.ReactNode;
};

export default function ModalNavigate({ href, className, children }: Props) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.replace(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
