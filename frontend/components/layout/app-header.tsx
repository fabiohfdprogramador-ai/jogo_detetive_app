"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FolderOpen, Home, Settings } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils/format";

const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/casos", label: "Casos", icon: FolderOpen },
  { href: "/desempenho", label: "Desempenho", icon: BarChart3 },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppHeader() {
  const pathname = usePathname();
  const inInvestigation = pathname.startsWith("/investigacao");

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="Rastro — página inicial" className="rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Navegação principal" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(pathname, href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                      isActive(pathname, href)
                        ? "bg-surface-2 text-ink"
                        : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      {!inInvestigation && (
        <nav
          aria-label="Navegação principal (celular)"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="grid grid-cols-4">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    isActive(pathname, href) ? "text-accent" : "text-muted",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
