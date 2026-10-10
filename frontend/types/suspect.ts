import type { Condition } from "./case";

export interface Suspect {
  id: string;
  name: string;
  age: number;
  occupation: string;
  description: string;
  /** Matiz (0-360) usado para gerar o retrato ilustrado original. */
  portraitHue: number;
  background: string;
  alibi: string;
  motive: string;
  /** Valores reais das características do perfil (ver CaseDefinition.traits). */
  traits: Record<string, string>;
  /** Características que só são conhecidas depois de uma condição. */
  hiddenTraits?: Record<string, Condition>;
  /** Suspeito só aparece na investigação depois da condição. */
  hiddenUntil?: Condition;
}

export type SuspectStatus =
  | "investigado"
  | "circunstancial"
  | "alibi_confirmado"
  | "descartado"
  | "identificado"
  | "capturado";
