import { ptBR, type MessageKey } from "./pt-BR";

export type Locale = "pt-BR";

const dictionaries: Record<Locale, Record<MessageKey, string>> = { "pt-BR": ptBR };

let currentLocale: Locale = "pt-BR";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

/** Traduz uma chave, substituindo marcadores no formato {nome}. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = dictionaries[currentLocale][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export type { MessageKey };
