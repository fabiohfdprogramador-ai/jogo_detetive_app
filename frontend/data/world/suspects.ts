import type { ChaseSuspect, ClueCategory, PlaceType, TraitKey } from "@/types/chase";

/** Organização criminosa fictícia e original do jogo. */
export const ORGANIZATION = { name: "Rede Mariposa", emoji: "🦋" };

export interface TraitOptionDef {
  value: string;
  label: string;
  emoji: string;
  /** Frases das testemunhas que revelam esta característica. */
  clues: string[];
}

export const TRAITS: { key: TraitKey; label: string; emoji: string; options: TraitOptionDef[] }[] = [
  {
    key: "sexo",
    label: "Sexo",
    emoji: "🧍",
    options: [
      { value: "feminino", label: "Feminino", emoji: "👩", clues: ["Era uma mulher, disso tenho certeza."] },
      { value: "masculino", label: "Masculino", emoji: "👨", clues: ["Era um homem, disso tenho certeza."] },
    ],
  },
  {
    key: "cabelo",
    label: "Cabelo",
    emoji: "💇",
    options: [
      { value: "preto", label: "Preto", emoji: "⚫", clues: ["Tinha o cabelo preto e bem liso.", "Reparei no cabelo preto, cor de carvão."] },
      { value: "castanho", label: "Castanho", emoji: "🟤", clues: ["Tinha cabelo castanho, meio ondulado.", "O cabelo era castanho, cor de café."] },
      { value: "loiro", label: "Loiro", emoji: "🟡", clues: ["Tinha cabelos loiros, quase dourados.", "Era loiro, bem claro."] },
      { value: "ruivo", label: "Ruivo", emoji: "🟠", clues: ["Tinha o cabelo ruivo, impossível de esquecer.", "Os cabelos eram cor de cobre."] },
      { value: "grisalho", label: "Grisalho", emoji: "⚪", clues: ["Tinha cabelo grisalho, bem penteado.", "O cabelo era todo prateado."] },
    ],
  },
  {
    key: "hobby",
    label: "Passatempo",
    emoji: "🎯",
    options: [
      { value: "xadrez", label: "Xadrez", emoji: "♟️", clues: ["Carregava um tabuleiro de xadrez de viagem.", "Ficou resolvendo problemas de xadrez enquanto esperava."] },
      { value: "alpinismo", label: "Alpinismo", emoji: "🧗", clues: ["Falou sem parar sobre escalar montanhas.", "Levava cordas e mosquetões de escalada na mochila."] },
      { value: "tenis", label: "Tênis", emoji: "🎾", clues: ["Levava uma raquete de tênis na bagagem.", "Perguntou se havia uma quadra de tênis por perto."] },
      { value: "opera", label: "Ópera", emoji: "🎼", clues: ["Cantarolava árias de ópera o tempo todo.", "Queria saber a programação das óperas da temporada."] },
      { value: "fotografia", label: "Fotografia", emoji: "📷", clues: ["Fotografava tudo com uma câmera antiga.", "Trocou o filme da câmera fotográfica bem na minha frente."] },
      { value: "culinaria", label: "Culinária", emoji: "🍳", clues: ["Comentou que adora cozinhar pratos exóticos.", "Anotava receitas num caderninho engordurado."] },
    ],
  },
  {
    key: "marca",
    label: "Marca registrada",
    emoji: "🔎",
    options: [
      { value: "tatuagem", label: "Tatuagem", emoji: "🐍", clues: ["Tinha uma tatuagem de serpente no antebraço.", "Vi uma tatuagem aparecendo pela manga."] },
      { value: "cicatriz", label: "Cicatriz", emoji: "🩹", clues: ["Tinha uma cicatriz atravessando a sobrancelha.", "Notei uma cicatriz fina no queixo."] },
      { value: "oculos", label: "Óculos escuros", emoji: "🕶️", clues: ["Usava óculos escuros redondos, mesmo em lugar fechado.", "Não tirou os óculos escuros nem por um segundo."] },
      { value: "anel", label: "Anel de rubi", emoji: "💍", clues: ["Usava um anel de rubi enorme.", "Brilhava no dedo um anel com uma pedra vermelha."] },
      { value: "chapeu", label: "Chapéu-panamá", emoji: "👒", clues: ["Não tirava da cabeça um chapéu-panamá.", "Usava um chapéu de palha bem elegante."] },
    ],
  },
  {
    key: "veiculo",
    label: "Veículo",
    emoji: "🚘",
    options: [
      { value: "conversivel", label: "Conversível", emoji: "🏎️", clues: ["Disse que sente falta do seu conversível.", "Perguntou onde alugar um carro conversível."] },
      { value: "moto", label: "Motocicleta", emoji: "🏍️", clues: ["Chegou numa moto barulhenta.", "Levava um capacete de motociclista debaixo do braço."] },
      { value: "limusine", label: "Limusine", emoji: "🚙", clues: ["Comentou que só anda de limusine.", "Uma limusine preta veio buscar essa pessoa."] },
      { value: "jipe", label: "Jipe", emoji: "🚜", clues: ["Falou do jipe que deixou em casa.", "Perguntou onde alugar um jipe para estradas de terra."] },
    ],
  },
];

/** Membros fictícios da Rede Mariposa. */
export const SUSPECTS: ChaseSuspect[] = [
  { id: "iris", name: "Íris Calafrio", emoji: "🦊", hue: 12, bio: "Ex-campeã de xadrez que trocou os torneios por golpes calculados.", traits: { sexo: "feminino", cabelo: "ruivo", hobby: "xadrez", marca: "tatuagem", veiculo: "conversivel" } },
  { id: "dora", name: "Dora Neblina", emoji: "🦇", hue: 210, bio: "Escaladora que entra em qualquer prédio pela fachada.", traits: { sexo: "feminino", cabelo: "preto", hobby: "alpinismo", marca: "oculos", veiculo: "jipe" } },
  { id: "lola", name: "Lola Varanda", emoji: "💃", hue: 330, bio: "Soprano frustrada que rouba joias durante as estreias.", traits: { sexo: "feminino", cabelo: "loiro", hobby: "opera", marca: "anel", veiculo: "limusine" } },
  { id: "bia", name: "Bia Ventania", emoji: "🎾", hue: 95, bio: "Tenista veloz que nunca é vista duas vezes no mesmo lugar.", traits: { sexo: "feminino", cabelo: "castanho", hobby: "tenis", marca: "cicatriz", veiculo: "moto" } },
  { id: "selma", name: "Selma Quimera", emoji: "📸", hue: 45, bio: "Fotógrafa que estuda cada alvo por meses antes de agir.", traits: { sexo: "feminino", cabelo: "grisalho", hobby: "fotografia", marca: "chapeu", veiculo: "conversivel" } },
  { id: "nina", name: "Nina Faísca", emoji: "🔥", hue: 20, bio: "Chef de cozinha que esconde o produto do roubo em bolos.", traits: { sexo: "feminino", cabelo: "ruivo", hobby: "culinaria", marca: "oculos", veiculo: "moto" } },
  { id: "otto", name: "Otto Penumbra", emoji: "🎩", hue: 260, bio: "Aristocrata falido que joga xadrez com a polícia.", traits: { sexo: "masculino", cabelo: "grisalho", hobby: "xadrez", marca: "anel", veiculo: "limusine" } },
  { id: "rubens", name: "Rubens Lagarto", emoji: "🦎", hue: 140, bio: "Cozinheiro de navio que conhece todos os portos do mundo.", traits: { sexo: "masculino", cabelo: "preto", hobby: "culinaria", marca: "tatuagem", veiculo: "jipe" } },
  { id: "teo", name: "Teo Malabar", emoji: "🤹", hue: 55, bio: "Ex-artista de circo e fotógrafo de cartões-postais.", traits: { sexo: "masculino", cabelo: "loiro", hobby: "fotografia", marca: "cicatriz", veiculo: "conversivel" } },
  { id: "caco", name: "Caco Vendaval", emoji: "🏔️", hue: 5, bio: "Alpinista que foge sempre pelo caminho mais alto.", traits: { sexo: "masculino", cabelo: "ruivo", hobby: "alpinismo", marca: "chapeu", veiculo: "moto" } },
  { id: "gaspar", name: "Gaspar Trapaça", emoji: "🎭", hue: 300, bio: "Tenor de voz potente e mestre dos disfarces.", traits: { sexo: "masculino", cabelo: "castanho", hobby: "opera", marca: "oculos", veiculo: "jipe" } },
  { id: "zeca", name: "Zeca Miragem", emoji: "🕴️", hue: 180, bio: "Tenista de clube elegante que some como uma miragem.", traits: { sexo: "masculino", cabelo: "preto", hobby: "tenis", marca: "anel", veiculo: "conversivel" } },
];

export function getChaseSuspect(id: string) {
  return SUSPECTS.find((s) => s.id === id);
}

export function traitOption(key: TraitKey, value: string) {
  return TRAITS.find((t) => t.key === key)?.options.find((o) => o.value === value);
}

/** Lugares visitáveis em cada cidade, a testemunha de cada um e o tipo de pista preferido. */
export const PLACES: Record<PlaceType, { label: string; emoji: string; witness: { role: string; emoji: string }; prefers: ClueCategory[] }> = {
  banco: { label: "Banco", emoji: "🏦", witness: { role: "Caixa do banco", emoji: "🧔" }, prefers: ["moeda", "geografia"] },
  aeroporto: { label: "Aeroporto", emoji: "✈️", witness: { role: "Agente de embarque", emoji: "💁" }, prefers: ["bandeira", "geografia"] },
  biblioteca: { label: "Biblioteca", emoji: "📚", witness: { role: "Bibliotecária", emoji: "👵" }, prefers: ["idioma", "geografia"] },
  museu: { label: "Museu", emoji: "🏛️", witness: { role: "Guia do museu", emoji: "🧐" }, prefers: ["turismo", "bandeira"] },
  mercado: { label: "Mercado", emoji: "🛒", witness: { role: "Feirante", emoji: "👩" }, prefers: ["comida", "moeda"] },
  hotel: { label: "Hotel", emoji: "🏨", witness: { role: "Recepcionista", emoji: "🙋" }, prefers: ["turismo", "idioma"] },
  porto: { label: "Porto", emoji: "⚓", witness: { role: "Pescador", emoji: "👴" }, prefers: ["geografia", "bandeira"] },
  cafe: { label: "Café", emoji: "☕", witness: { role: "Garçom", emoji: "🤵" }, prefers: ["comida", "turismo"] },
};

/**
 * Patentes. `stops` = cidades na rota; `deadline` = prazo em horas desde segunda 00:00.
 * Prazos calibrados por simulação: mesmo visitando todos os lugares, sobram de 34 h a 52 h
 * no pior caso, o suficiente para um ou dois desvios por cidades erradas.
 */
export const RANKS = [
  { name: "Recruta", min: 0, emoji: "🔰", stops: 4, deadline: 5 * 24 + 17 },
  { name: "Investigador(a) Júnior", min: 1, emoji: "🕵️", stops: 4, deadline: 5 * 24 + 17 },
  { name: "Detetive", min: 3, emoji: "🔍", stops: 5, deadline: 6 * 24 + 9 },
  { name: "Inspetor(a)", min: 6, emoji: "🎖️", stops: 5, deadline: 6 * 24 + 9 },
  { name: "Agente Especial", min: 10, emoji: "⭐", stops: 6, deadline: 6 * 24 + 17 },
  { name: "Diretor(a) de Campo", min: 15, emoji: "🏆", stops: 6, deadline: 6 * 24 + 17 },
];

export function rankIndexFor(solved: number): number {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (solved >= r.min) index = i;
  });
  return index;
}
