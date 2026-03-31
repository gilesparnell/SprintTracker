"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNavLink({
  href,
  matchPrefixes,
  children,
  className,
  activeClassName,
  inactiveClassName,
}: {
  href: string;
  matchPrefixes?: string[];
  children: React.ReactNode;
  className?: string;
  activeClassName: string;
  inactiveClassName: string;
}) {
  const pathname = usePathname();
  const prefixes = matchPrefixes ?? [href];
  const isActive = prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return (
    <Link
      href={href}
      className={`${className ?? ""} ${isActive ? activeClassName : inactiveClassName}`}
    >
      {children}
    </Link>
  );
}
