"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, RotateCcw, Volume2 } from "lucide-react";
import { sound } from "@/lib/audio/sound";
import { useGame } from "@/components/game/game-provider";
import { Card, CardHeader, LoadingScreen } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { listCases } from "@/lib/game/case-loader";
import type { GameSettings } from "@/types/game";
import { cn } from "@/lib/utils/format";

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-medium text-ink">{label}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-focus-visible:outline-offset-2" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-ink transition-transform peer-checked:translate-x-5" />
        <span className="sr-only">{checked ? "Ativado" : "Desativado"}</span>
      </span>
    </label>
  );
}

function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="py-3">
      <legend className="font-medium text-ink">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-10 rounded-lg border px-3 text-sm",
              value === o.value ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-soft hover:bg-surface-2",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const notify = useToast();
  const { ready, save, storageKind, updateSettings, setTutorialCompleted, resetCampaign } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  if (!ready) return <LoadingScreen />;
  const s = save.settings;
  const set = (patch: Partial<GameSettings>) => updateSettings(patch);
  const firstCase = listCases()[0]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Configurações</h1>
        <p className="mt-1 text-ink-soft">As preferências são salvas automaticamente.</p>
      </header>

      <Card>
        <CardHeader title="Jogo" />
        <div className="divide-y divide-line px-4">
          <Toggle
            label="Dicas"
            description="Permite liberar dicas durante os casos (cada dica reduz a pontuação)."
            checked={s.hintsEnabled}
            onChange={(v) => set({ hintsEnabled: v })}
          />
          <Toggle
            label="Confirmar viagens"
            description="Pede confirmação, com o custo em tempo, antes de cada deslocamento."
            checked={s.confirmTravel}
            onChange={(v) => set({ confirmTravel: v })}
          />
          <Toggle
            label="Tutorial no primeiro caso"
            description="Mostra as instruções interativas ao abrir o primeiro caso."
            checked={s.tutorialEnabled}
            onChange={(v) => set({ tutorialEnabled: v })}
          />
          <div className="py-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<GraduationCap className="size-4" aria-hidden />}
              onClick={() => {
                set({ tutorialEnabled: true });
                setTutorialCompleted(false);
                notify("O tutorial será exibido na próxima vez que você abrir o primeiro caso.", "info");
                router.push(`/casos/${firstCase.slug}`);
              }}
            >
              Rever o tutorial
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Som" />
        <div className="divide-y divide-line px-4">
          <Toggle
            label="Efeitos sonoros"
            description="Máquina de escrever, voos, sirene e sons de pistas."
            checked={s.soundEnabled}
            onChange={(v) => set({ soundEnabled: v })}
          />
          <Toggle
            label="Música"
            description="Trilha de fundo original, gerada pelo próprio jogo."
            checked={s.musicEnabled}
            onChange={(v) => set({ musicEnabled: v })}
          />
          <div className="py-3">
            <label htmlFor="volume" className="font-medium text-ink">
              Volume: {s.volume}%
            </label>
            <input
              id="volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={s.volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
              className="mt-2 w-full accent-[var(--color-accent)]"
            />
            <Button
              className="mt-2"
              variant="secondary"
              size="sm"
              icon={<Volume2 className="size-4" aria-hidden />}
              onClick={() => {
                sound.unlock();
                sound.play("success");
              }}
            >
              Testar som
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Acessibilidade" />
        <div className="divide-y divide-line px-4">
          <Choice
            legend="Tamanho do texto"
            value={s.textSize}
            options={[
              { value: "normal", label: "Normal" },
              { value: "grande", label: "Grande" },
            ]}
            onChange={(v) => set({ textSize: v })}
          />
          <Choice
            legend="Animações"
            value={s.reducedMotion}
            options={[
              { value: "sistema", label: "Seguir o sistema" },
              { value: "reduzir", label: "Reduzir sempre" },
            ]}
            onChange={(v) => set({ reducedMotion: v })}
          />
          <div className="py-3">
            <p className="font-medium text-ink">Idioma</p>
            <p className="text-sm text-muted">Português (Brasil). Outros idiomas poderão ser adicionados futuramente.</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Dados e progresso" />
        <div className="space-y-3 p-4 text-sm">
          <p className="text-ink-soft">
            Armazenamento atual:{" "}
            <strong className="text-ink">{storageKind === "api" ? "servidor do jogo (backend)" : "este navegador"}</strong>.
            Nenhum dado pessoal é coletado e nada é enviado a serviços de terceiros.
          </p>
          <Button variant="danger" icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => setConfirmReset(true)}>
            Reiniciar toda a campanha
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reiniciar toda a campanha?"
        confirmLabel="Apagar progresso"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void resetCampaign().then(() => notify("Campanha reiniciada.", "sucesso"));
        }}
      >
        <p>Todos os casos, investigações em andamento e estatísticas serão apagados. As configurações são mantidas.</p>
        <p className="font-medium text-danger">Esta ação não pode ser desfeita.</p>
      </ConfirmDialog>
    </div>
  );
}
