import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCaseById, listCases } from "@/lib/game/case-loader";
import { ReportView } from "@/components/game/report-view";

export const dynamicParams = false;

export function generateStaticParams() {
  return listCases().map((c) => ({ caseId: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ caseId: string }> }): Promise<Metadata> {
  const { caseId } = await params;
  return { title: `Relatório · ${getCaseById(caseId)?.title ?? "Caso"}` };
}

export default async function ReportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseDef = getCaseById(caseId);
  if (!caseDef) notFound();
  return <ReportView caseId={caseDef.id} />;
}
