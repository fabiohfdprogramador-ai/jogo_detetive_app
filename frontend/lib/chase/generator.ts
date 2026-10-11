/**
 * Gera uma missão do Modo Perseguição a partir de uma semente:
 * rota de cidades, responsável, cidades de despiste e as falas das testemunhas.
 */
import type { ChaseCase, ChaseSpot, ChaseStop, ClueCategory, PlaceType, TraitKey, WorldCity } from "@/types/chase";
import { CITIES, distanceKm, getCity } from "@/data/world/cities";
import { PLACES, RANKS, SUSPECTS, traitOption } from "@/data/world/suspects";
import { createRng, type Rng } from "./rng";

export const START_HOUR = 9; // segunda-feira, 09:00
export const MAX_HOP_KM = 8000;

const OPENINGS = [
  "Sim, vi essa pessoa!",
  "Passou por aqui faz pouco tempo.",
  "Lembro bem dessa figura.",
  "Ah, essa pessoa? Esteve aqui, sim.",
  "Foi embora com pressa, mas reparei em tudo.",
];

const NOTHING = [
  "Desculpe, não vi ninguém com essa descrição.",
  "Por aqui? Ninguém assim, agente.",
  "Nunca vi essa pessoa na vida.",
  "Hoje o movimento foi fraco. Ninguém parecido passou por aqui.",
];

const FINAL_WARNINGS = [
  "⚠️ Cuidado, agente! Vi alguém com essa descrição se escondendo por estas ruas há pouco.",
  "🚨 A pessoa que você procura está muito perto. Fique de olhos bem abertos!",
  "👀 Um vulto passou correndo por aqui agorinha. Está quente, agente!",
];

const HENCHMAN = "🥷 E tem mais: um sujeito mal-encarado ficou vigiando a porta depois. Parece que você está na trilha certa.";

const ALL_TRAITS: TraitKey[] = ["cabelo", "hobby", "marca", "veiculo"];

export function matchingSuspectIds(filter: Partial<Record<TraitKey, string>>): string[] {
  return SUSPECTS.filter((s) =>
    (Object.entries(filter) as [TraitKey, string | undefined][]).every(([k, v]) => !v || s.traits[k] === v),
  ).map((s) => s.id);
}

/** Escolhe características (além do sexo) até identificar o responsável sem ambiguidade. */
function chooseRevealedTraits(rng: Rng, culpritId: string): TraitKey[] {
  const culprit = SUSPECTS.find((s) => s.id === culpritId)!;
  const chosen: TraitKey[] = [];
  for (const key of rng.shuffle(ALL_TRAITS)) {
    chosen.push(key);
    const filter: Partial<Record<TraitKey, string>> = { sexo: culprit.traits.sexo };
    for (const k of chosen) filter[k] = culprit.traits[k];
    if (chosen.length >= 2 && matchingSuspectIds(filter).length === 1) break;
  }
  return chosen;
}

/** Pista sobre a próxima cidade, evitando categorias que não diferenciam dos despistes. */
function destinationClue(rng: Rng, place: PlaceType, next: WorldCity, decoys: WorldCity[], used: Set<ClueCategory>): string {
  const usable = (cat: ClueCategory) => {
    if (cat === "moeda") return decoys.every((d) => d.currency !== next.currency);
    if (cat === "idioma") return decoys.every((d) => d.language !== next.language);
    if (cat === "bandeira") return decoys.every((d) => d.countryCode !== next.countryCode);
    return true;
  };
  const order: ClueCategory[] = [...PLACES[place].prefers, "turismo", "geografia", "comida", "bandeira", "moeda", "idioma"];
  const category = order.find((c) => usable(c) && !used.has(c)) ?? order.find(usable) ?? "turismo";
  used.add(category);
  switch (category) {
    case "moeda":
      return rng.pick([`Trocou um bom dinheiro por ${next.currency}.`, `Perguntou a cotação de ${next.currency}.`]);
    case "idioma":
      return rng.pick([`Estava aprendendo algumas frases em ${next.language}.`, `Carregava um dicionário de ${next.language}.`]);
    case "bandeira":
      return next.flag;
    case "turismo":
      return rng.pick(next.turismo);
    case "comida":
      return rng.pick(next.comida);
    case "geografia":
      return rng.pick(next.geografia);
  }
}

function pickPlaces(rng: Rng): PlaceType[] {
  return rng.shuffle(Object.keys(PLACES) as PlaceType[]).slice(0, 3);
}

function spot(cityId: string, place: PlaceType, lines: string[], extra: Partial<ChaseSpot> = {}): ChaseSpot {
  return { id: `${cityId}-${place}`, place, witness: PLACES[place].witness, lines, ...extra };
}

export function generateChase(seed: number, rankIndex = 0): ChaseCase {
  const rng = createRng(seed);
  const rank = RANKS[Math.max(0, Math.min(RANKS.length - 1, rankIndex))]!;
  const stopsCount = rank.stops;
  const decoysPerStop = rankIndex < 2 ? 2 : 3;

  // Rota: cidades distintas, cada uma em país diferente da anterior.
  const route: WorldCity[] = [rng.pick(CITIES)];
  while (route.length < stopsCount) {
    const last = route[route.length - 1]!;
    const options = CITIES.filter((c) => c.countryCode !== last.countryCode && !route.some((r) => r.id === c.id));
    // Trechos de até 8.000 km mantêm a missão vencível dentro do prazo.
    const near = options.filter((c) => distanceKm(last, c) <= MAX_HOP_KM);
    route.push(rng.pick(near.length > 0 ? near : options));
  }

  const culprit = rng.pick(SUSPECTS);
  const revealedTraits = chooseRevealedTraits(rng, culprit.id);

  // Distribui as pistas sobre o suspeito pelas cidades da rota (exceto a final).
  const traitSlots = new Map<string, TraitKey>();
  const clueCities = rng.shuffle(route.slice(0, -1).map((_, i) => i));
  const toPlace = [...revealedTraits, rng.pick(revealedTraits)];
  toPlace.forEach((trait, n) => {
    const cityIndex = clueCities[n % clueCities.length]!;
    let slot = rng.int(3);
    while (traitSlots.has(`${cityIndex}:${slot}`)) slot = (slot + 1) % 3;
    traitSlots.set(`${cityIndex}:${slot}`, trait);
  });

  const usedIds = new Set(route.map((c) => c.id));
  const stops: Record<string, ChaseStop> = {};

  route.forEach((city, i) => {
    const prev = route[i - 1];
    const next = route[i + 1];
    const places = pickPlaces(rng);

    if (!next) {
      const hideout = rng.int(3);
      const warnings = rng.shuffle(FINAL_WARNINGS);
      stops[city.id] = {
        cityId: city.id,
        kind: "final",
        connections: prev ? [prev.id] : [],
        spots: places.map((place, j) =>
          j === hideout
            ? spot(city.id, place, ["🔦 Há uma porta entreaberta nos fundos…"], { hideout: true })
            : spot(city.id, place, [warnings[j % warnings.length]!]),
        ),
      };
      return;
    }

    const decoyOptions = CITIES.filter((c) => !usedIds.has(c.id) && c.countryCode !== next.countryCode && c.countryCode !== city.countryCode);
    const decoys = rng.shuffle(decoyOptions).slice(0, decoysPerStop);
    decoys.forEach((d) => usedIds.add(d.id));

    const usedCategories = new Set<ClueCategory>();
    const henchmanSpot = i > 0 ? rng.int(3) : -1;
    stops[city.id] = {
      cityId: city.id,
      kind: "rota",
      connections: rng.shuffle([next.id, ...decoys.map((d) => d.id), ...(prev ? [prev.id] : [])]),
      spots: places.map((place, j) => {
        const lines = [`${rng.pick(OPENINGS)} ${destinationClue(rng, place, next, prev ? [...decoys, prev] : decoys, usedCategories)}`];
        const trait = traitSlots.get(`${i}:${j}`);
        let traitClue: ChaseSpot["traitClue"];
        if (trait) {
          const value = culprit.traits[trait];
          lines.push(rng.pick(traitOption(trait, value)!.clues));
          traitClue = { trait, value };
        }
        if (j === henchmanSpot) lines.push(HENCHMAN);
        return spot(city.id, place, lines, traitClue ? { traitClue } : {});
      }),
    };

    for (const decoy of decoys) {
      const nothing = rng.shuffle(NOTHING);
      stops[decoy.id] = {
        cityId: decoy.id,
        kind: "despiste",
        connections: [city.id],
        spots: pickPlaces(rng).map((place, j) => spot(decoy.id, place, [nothing[j % nothing.length]!])),
      };
    }
  });

  return {
    id: `missao_${seed}`,
    seed,
    rankIndex,
    item: route[0]!.item,
    route: route.map((c) => c.id),
    culpritId: culprit.id,
    revealedTraits,
    stops,
    startHour: START_HOUR,
    deadlineHour: rank.deadline,
  };
}

export function cityOf(id: string): WorldCity {
  const city = getCity(id);
  if (!city) throw new Error(`Cidade desconhecida: ${id}`);
  return city;
}
