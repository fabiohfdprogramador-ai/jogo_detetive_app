export type EvidenceCategory =
  | "fisica"
  | "documental"
  | "depoimento"
  | "digital"
  | "financeira"
  | "registro";

/**
 * Relevância real da evidência. Usada no cálculo de pontuação e nas verificações de
 * consistência; nunca é exibida ao jogador antes do relatório final.
 */
export type EvidenceRelevance = "chave" | "relevante" | "secundaria" | "enganosa";

export interface Evidence {
  id: string;
  title: string;
  description: string;
  category: EvidenceCategory;
  /** Quem ou o que forneceu a evidência (documento, testemunha, perícia...). */
  source: string;
  locationId: string;
  relevance: EvidenceRelevance;
  relatedEvidenceIds?: string[];
  relatedSuspectIds?: string[];
  /**
   * Fatos sobre o perfil do autor que a evidência permite deduzir. Metadado interno
   * usado pelos testes de consistência; a interface mostra apenas a descrição.
   */
  reveals?: { trait: string; value: string }[];
}
