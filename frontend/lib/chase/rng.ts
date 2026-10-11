/** Gerador pseudoaleatório determinístico (mulberry32): a mesma semente gera a mesma missão. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    pick<T>(list: readonly T[]): T {
      if (list.length === 0) throw new Error("Lista vazia");
      return list[Math.floor(next() * list.length)]!;
    },
    shuffle<T>(list: readonly T[]): T[] {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      }
      return copy;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
