"use client";

import { useState } from "react";
import { Link2, Star, StarOff, Unlink } from "lucide-react";
import type { CaseDefinition } from "@/types/case";
import type { Evidence, EvidenceCategory } from "@/types/evidence";
import type { GameSession } from "@/types/game";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getEvidence, getLocation, getSuspect } from "@/lib/game/selectors";
import { t } from "@/lib/i18n";
import { cn, formatGameClock } from "@/lib/utils/format";

const CATEGORIES: EvidenceCategory[] = ["fisica", "documental", "depoimento", "digital", "financeira", "registro"];

export function EvidenceCard({
  evidence,
  caseDef,
  session,
  onOpen,
  linkMode,
  linkSource,
}: {
  evidence: Evidence;
  caseDef: CaseDefinition;
  session: GameSession;
  onOpen: () => void;
  linkMode?: boolean;
  linkSource?: string | null;
}) {
  const flagged = session.flaggedEvidenceIds.includes(evidence.id);
  const links = session.evidenceLinks.filter(([a, b]) => a === evidence.id || b === evidence.id).length;
  const isNew = session.actionHistory.length > 0 && session.evidenceFoundAt[evidence.id] === Math.max(...Object.values(session.evidenceFoundAt));
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg border bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3",
        linkSource === evidence.id ? "border-info" : flagged ? "border-accent/60" : "border-line",
        linkMode && linkSource !== evidence.id && "ring-1 ring-info/40",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-medium text-ink">{evidence.title}</span>
        {flagged && <Star className="size-4 shrink-0 fill-accent text-accent" aria-label="Marcada como relevante" />}
      </span>
      <span className="line-clamp-2 text-sm text-muted">{evidence.description}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge>{t(`evidence.${evidence.category}`)}</Badge>
        <span className="text-xs text-muted">{getLocation(caseDef, evidence.locationId)?.name}</span>
        {links > 0 && (
          <Badge tone="info" icon={<Link2 className="size-3" aria-hidden />}>
            {links} relação(ões)
          </Badge>
        )}
        {isNew && <Badge tone="accent">Nova</Badge>}
      </span>
    </button>
  );
}

export function EvidenceArchive({
  caseDef,
  session,
  onToggleFlag,
  onToggleLink,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  onToggleFlag: (id: string) => void;
  onToggleLink: (a: string, b: string) => void;
}) {
  const [filter, setFilter] = useState<EvidenceCategory | "todas" | "marcadas">("todas");
  const [openId, setOpenId] = useState<string | null>(null);
  const [linkSource, setLinkSource] = useState<string | null>(null);

  const discovered = session.discoveredEvidenceIds
    .map((id) => getEvidence(caseDef, id))
    .filter((e): e is Evidence => !!e)
    .reverse();
  const list = discovered.filter((e) =>
    filter === "todas" ? true : filter === "marcadas" ? session.flaggedEvidenceIds.includes(e.id) : e.category === filter,
  );
  const open = openId ? getEvidence(caseDef, openId) : undefined;

  const handleOpen = (id: string) => {
    if (linkSource && linkSource !== id) {
      onToggleLink(linkSource, id);
      setLinkSource(null);
      return;
    }
    setOpenId(id);
  };

  if (discovered.length === 0) {
    return (
      <EmptyState
        title="Nenhuma evidência coletada"
        description="Examine o local, consulte registros e entreviste testemunhas para preencher o arquivo."
      />
    );
  }

  const usedCategories = CATEGORIES.filter((c) => discovered.some((e) => e.category === c));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar evidências">
        {(["todas", "marcadas", ...usedCategories] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "min-h-8 rounded-md border px-2.5 text-xs font-medium",
              filter === key ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-ink-soft hover:bg-surface-2",
            )}
          >
            {key === "todas" ? `Todas (${discovered.length})` : key === "marcadas" ? "Marcadas" : t(`evidence.${key}`)}
          </button>
        ))}
      </div>

      {linkSource && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-info/50 bg-info/10 px-3 py-2 text-sm text-ink">
          <span>Escolha a evidência que se relaciona com “{getEvidence(caseDef, linkSource)?.title}”.</span>
          <Button size="sm" variant="ghost" onClick={() => setLinkSource(null)}>
            Cancelar
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState title="Nenhuma evidência neste filtro" />
      ) : (
        <ul className="grid gap-2">
          {list.map((e) => (
            <li key={e.id}>
              <EvidenceCard
                evidence={e}
                caseDef={caseDef}
                session={session}
                onOpen={() => handleOpen(e.id)}
                linkMode={!!linkSource}
                linkSource={linkSource}
              />
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Modal
          open
          onClose={() => setOpenId(null)}
          title={open.title}
          footer={
            <>
              <Button
                variant="secondary"
                icon={<Link2 className="size-4" aria-hidden />}
                disabled={discovered.length < 2}
                onClick={() => {
                  setLinkSource(open.id);
                  setOpenId(null);
                }}
              >
                Relacionar com…
              </Button>
              <Button
                variant={session.flaggedEvidenceIds.includes(open.id) ? "secondary" : "primary"}
                icon={
                  session.flaggedEvidenceIds.includes(open.id) ? (
                    <StarOff className="size-4" aria-hidden />
                  ) : (
                    <Star className="size-4" aria-hidden />
                  )
                }
                onClick={() => onToggleFlag(open.id)}
              >
                {session.flaggedEvidenceIds.includes(open.id) ? "Desmarcar" : "Marcar como relevante"}
              </Button>
            </>
          }
        >
          <EvidenceDetail caseDef={caseDef} session={session} evidence={open} onUnlink={onToggleLink} />
        </Modal>
      )}
    </div>
  );
}

function EvidenceDetail({
  caseDef,
  session,
  evidence,
  onUnlink,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  evidence: Evidence;
  onUnlink: (a: string, b: string) => void;
}) {
  const playerLinks = session.evidenceLinks
    .filter(([a, b]) => a === evidence.id || b === evidence.id)
    .map(([a, b]) => (a === evidence.id ? b : a));
  // Relações "oficiais" só aparecem quando as duas evidências já foram coletadas.
  const knownRelations = (evidence.relatedEvidenceIds ?? []).filter((id) => session.discoveredEvidenceIds.includes(id));
  const suspects = (evidence.relatedSuspectIds ?? []).map((id) => getSuspect(caseDef, id)).filter(Boolean);
  const foundAt = session.evidenceFoundAt[evidence.id];

  return (
    <div className="space-y-4 text-sm">
      <p className="text-base text-ink">{evidence.description}</p>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-2 p-3">
        <div>
          <dt className="text-muted">Categoria</dt>
          <dd className="text-ink">{t(`evidence.${evidence.category}`)}</dd>
        </div>
        <div>
          <dt className="text-muted">Origem</dt>
          <dd className="text-ink">{evidence.source}</dd>
        </div>
        <div>
          <dt className="text-muted">Local</dt>
          <dd className="text-ink">{getLocation(caseDef, evidence.locationId)?.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Coletada em</dt>
          <dd className="font-mono text-ink">
            {foundAt !== undefined ? formatGameClock(caseDef.clockStart, foundAt) : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted">Relevância</dt>
          <dd className="text-ink">
            {session.flaggedEvidenceIds.includes(evidence.id)
              ? "Marcada por você como relevante"
              : "Não marcada. A relevância real é avaliada no relatório final."}
          </dd>
        </div>
      </dl>
      {suspects.length > 0 && (
        <div>
          <p className="font-medium text-muted">Pessoas mencionadas</p>
          <p className="text-ink">{suspects.map((s) => s!.name).join(", ")}</p>
        </div>
      )}
      {knownRelations.length > 0 && (
        <div>
          <p className="font-medium text-muted">Complementa</p>
          <ul className="list-disc pl-5 text-ink">
            {knownRelations.map((id) => (
              <li key={id}>{getEvidence(caseDef, id)?.title}</li>
            ))}
          </ul>
        </div>
      )}
      {playerLinks.length > 0 && (
        <div>
          <p className="font-medium text-muted">Suas relações</p>
          <ul className="space-y-1">
            {playerLinks.map((id) => (
              <li key={id} className="flex items-center justify-between gap-2 text-ink">
                {getEvidence(caseDef, id)?.title}
                <Button size="sm" variant="ghost" icon={<Unlink className="size-4" aria-hidden />} onClick={() => onUnlink(evidence.id, id)}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
