import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCaseById, listCases } from "@/lib/game/case-loader";
import { BriefingView } from "@/components/game/briefing-view";

export const dynamicParams = false;

export function generateStaticParams() {
  return listCases().map((c) => ({ caseId: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ caseId: string }> }): Promise<Metadata> {
  const { caseId } = await params;
  return { title: getCaseById(caseId)?.title ?? "Caso" };
}

export default async function CaseBriefingPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseDef = getCaseById(caseId);
  if (!caseDef) notFound();
  return <BriefingView caseId={caseDef.id} />;
}
