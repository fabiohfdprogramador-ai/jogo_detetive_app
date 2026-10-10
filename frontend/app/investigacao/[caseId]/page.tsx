import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCaseById, listCases } from "@/lib/game/case-loader";
import { InvestigationView } from "@/components/game/investigation-view";

export const dynamicParams = false;

export function generateStaticParams() {
  return listCases().map((c) => ({ caseId: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ caseId: string }> }): Promise<Metadata> {
  const { caseId } = await params;
  return { title: `Central · ${getCaseById(caseId)?.title ?? "Caso"}` };
}

export default async function InvestigationPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseDef = getCaseById(caseId);
  if (!caseDef) notFound();
  return <InvestigationView caseId={caseDef.id} />;
}
