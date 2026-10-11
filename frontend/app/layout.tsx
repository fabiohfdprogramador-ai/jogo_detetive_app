import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GameProvider } from "@/components/game/game-provider";
import { ToastProvider } from "@/components/ui/toast";
import { AppHeader } from "@/components/layout/app-header";
import { SaveStatus } from "@/components/layout/save-status";

export const metadata: Metadata = {
  title: { default: "Rastro — Agência Meridiano", template: "%s · Rastro" },
  description: "Jogo de investigação e dedução: colete evidências, interrogue testemunhas e capture os responsáveis.",
  applicationName: "Rastro",
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/icon.svg` },
};

export const viewport: Viewport = {
  themeColor: "#0a1120",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <GameProvider>
          <ToastProvider>
            <AppHeader />
            <SaveStatus />
            <main id="conteudo" className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 md:pb-12">
              {children}
            </main>
          </ToastProvider>
        </GameProvider>
      </body>
    </html>
  );
}
