"use client";

import { useState } from "react";
import { AlertTriangle, Gavel, ShieldCheck } from "lucide-react";
import type { CaseDefinition } from "@/types/case";
import type { GameSession, WarrantRequest } from "@/types/game";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { getEvidence, getProfileMatches, getSuspect, isFinished } from "@/lib/game/selectors";
import { getScoringRules } from "@/lib/game/scoring";
import { cn, formatDuration } from "@/lib/utils/format";

/**
 * Perfil do autor + pedido de mandado. O perfil é salvo a cada escolha; a lista de
 * compatibilidade compara só características já conhecidas dos suspeitos.
 */
export function WarrantPanel({
  caseDef,
  session,
  onProfileChange,
  onSubmit,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  onProfileChange: (trait: string, value: string | null) => void;
  onSubmit: (request: WarrantRequest) => void;
}) {
  const rules = caseDef.completionRules;
  const scoring = getScoringRules(caseDef);
  const [suspectId, setSuspectId] = useState<string>(session.warrant.lastRequest?.suspectId ?? "");
  const [cited, setCited] = useState<string[]>(
    () => session.warrant.lastRequest?.citedEvidenceIds ?? session.flaggedEvidenceIds,
  );
  const [confirm, setConfirm] = useState(false);

  const matches = getProfileMatches(caseDef, session);
  const finished = isFinished(session);

  if (session.warrant.status === "autorizado") {
    const suspect = getSuspect(caseDef, session.selectedSuspectId ?? "");
    return (
      <div className="space-y-3 rounded-lg border border-accent/50 bg-accent/10 p-4">
        <p className="flex items-center gap-2 font-semibold text-accent">
          <ShieldCheck className="size-5" aria-hidden /> Mandado autorizado
        </p>
        <p className="text-sm text-ink">
          Mandado expedido contra <strong>{suspect?.name}</strong>.{" "}
          {session.status === "mandado_autorizado"
            ? "Descubra onde o suspeito está, vá até lá e execute a captura no painel do local atual."
            : ""}
        </p>
        <p className="text-sm text-muted">
          Capturas no local errado custam {formatDuration(rules.captureTimeCost + rules.wrongCaptureTimePenalty)} e{" "}
          {scoring.wrongCapturePenalty} pontos. Após {rules.maxCaptureAttempts} tentativas frustradas, o suspeito foge.
        </p>
      </div>
    );
  }

  const evidenceList = session.discoveredEvidenceIds.map((id) => getEvidence(caseDef, id)!).filter(Boolean);
  const profileComplete = caseDef.traits.every((tr) => session.profile[tr.key]);
  const enoughEvidence = session.discoveredEvidenceIds.length >= rules.minEvidenceForWarrant;
  const canSubmit = !finished && enoughEvidence && profileComplete && !!suspectId && cited.length >= rules.minCitedEvidence;
  const attemptsLeft = rules.maxWarrantAttempts - session.warrant.attempts;

  return (
    <div className="space-y-5">
      <section aria-labelledby="perfil-titulo" className="space-y-3">
        <h3 id="perfil-titulo" className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          1. Perfil do autor
        </h3>
        {caseDef.traits.map((trait) => (
          <fieldset key={trait.key} className="space-y-1.5" disabled={finished}>
            <legend className="text-sm font-medium text-ink">{trait.question}</legend>
            <div className="flex flex-wrap gap-1.5">
              {trait.options.map((option) => {
                const selected = session.profile[trait.key] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onProfileChange(trait.key, selected ? null : option.value)}
                    className={cn(
                      "min-h-9 rounded-md border px-3 text-sm",
                      selected ? "border-accent bg-accent/15 font-medium text-accent" : "border-line text-ink-soft hover:bg-surface-2",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </section>

      <section aria-labelledby="compat-titulo" className="space-y-2">
        <h3 id="compat-titulo" className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          2. Suspeito indicado
        </h3>
        <p className="text-sm text-muted">
          A compatibilidade considera apenas características já conhecidas de cada suspeito.
        </p>
        <ul className="space-y-1.5" role="radiogroup" aria-label="Suspeito indicado">
          {matches.map(({ suspect, compatible, conflicts, unknown }) => (
            <li key={suspect.id}>
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                  suspectId === suspect.id ? "border-accent bg-accent/10" : "border-line hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  name="suspeito"
                  value={suspect.id}
                  checked={suspectId === suspect.id}
                  onChange={() => setSuspectId(suspect.id)}
                  disabled={finished}
                  className="accent-[var(--color-accent)]"
                />
                <span className="flex-1 text-ink">{suspect.name}</span>
                {Object.keys(session.profile).length === 0 ? null : compatible ? (
                  <Badge tone={unknown > 0 ? "warn" : "ok"}>{unknown > 0 ? `Compatível (${unknown} desconhecida)` : "Compatível"}</Badge>
                ) : (
                  <Badge tone="neutral">{conflicts} divergência(s)</Badge>
                )}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="citar-titulo" className="space-y-2">
        <h3 id="citar-titulo" className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          3. Evidências citadas (mínimo {rules.minCitedEvidence})
        </h3>
        {evidenceList.length === 0 ? (
          <p className="text-sm text-muted">Colete evidências antes de montar o pedido.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
            {evidenceList.map((e) => (
              <li key={e.id}>
                <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={cited.includes(e.id)}
                    disabled={finished}
                    onChange={(ev) =>
                      setCited((list) => (ev.target.checked ? [...list, e.id] : list.filter((id) => id !== e.id)))
                    }
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <span className="text-ink">{e.title}</span>
                  {session.flaggedEvidenceIds.includes(e.id) && <Badge tone="accent">Marcada</Badge>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-2 rounded-lg border border-line bg-surface-2 p-3 text-sm">
        <p className="flex items-start gap-2 text-ink-soft">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <span>
            Protocolar custa {formatDuration(rules.warrantTimeCost)}. Um pedido negado custa mais{" "}
            {formatDuration(rules.wrongWarrantTimePenalty)} e {scoring.wrongWarrantPenalty} pontos. Tentativas restantes:{" "}
            <strong className="text-ink">{attemptsLeft}</strong>.
          </span>
        </p>
        {!enoughEvidence && (
          <p className="text-warn">O juiz só analisa pedidos com pelo menos {rules.minEvidenceForWarrant} evidências coletadas.</p>
        )}
        {session.warrant.status === "negado" && <p className="text-danger">O último pedido foi negado. Revise o perfil e as evidências.</p>}
      </div>

      <Button className="w-full" size="lg" disabled={!canSubmit} icon={<Gavel className="size-5" aria-hidden />} onClick={() => setConfirm(true)}>
        Solicitar mandado
      </Button>

      <ConfirmDialog
        open={confirm}
        title="Protocolar pedido de mandado?"
        confirmLabel="Protocolar"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onSubmit({ suspectId, traitAnswers: { ...session.profile }, citedEvidenceIds: cited });
        }}
      >
        <p>
          Suspeito: <strong className="text-ink">{getSuspect(caseDef, suspectId)?.name}</strong>
        </p>
        <p>Evidências citadas: {cited.length}</p>
        <p>
          Se o pedido for negado você perde {formatDuration(rules.warrantTimeCost + rules.wrongWarrantTimePenalty)} e{" "}
          {scoring.wrongWarrantPenalty} pontos. Restam {attemptsLeft} tentativa(s).
        </p>
      </ConfirmDialog>
    </div>
  );
}
