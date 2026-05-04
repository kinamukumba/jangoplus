// Taxonomia de Bloom — invisível para o aluno.
// Internamente usamos 4 níveis; mostramos só "Base / Intermédio / Avançado".

export type BloomLevel = 1 | 2 | 3 | 4;

// Nomes técnicos (não mostrar no UI do aluno — só em ferramentas internas).
export const BLOOM_TECHNICAL: Record<BloomLevel, string> = {
  1: "Lembrar",
  2: "Entender",
  3: "Aplicar",
  4: "Analisar",
};

// Rótulos públicos simples (mostrar ao aluno e nos relatórios para pais).
export const BLOOM_PUBLIC: Record<BloomLevel, "Base" | "Intermédio" | "Avançado"> = {
  1: "Base",
  2: "Base",
  3: "Intermédio",
  4: "Avançado",
};

// Frase curta para relatório de pais (linguagem simples).
export const BLOOM_PARENT_DESCRIPTION: Record<BloomLevel, string> = {
  1: "Memorização de factos",
  2: "Compreensão de conceitos",
  3: "Aplicação em problemas",
  4: "Análise e raciocínio crítico",
};

// Desempenho mínimo para desbloquear o próximo nível.
export const UNLOCK_THRESHOLD = 0.7; // 70%

// Início padrão: aluno começa com Base (níveis 1-2 disponíveis).
export const INITIAL_UNLOCKED: BloomLevel = 2;

// Decide se o aluno deve subir o nível desbloqueado, com base no desempenho
// no nível mais alto a que teve acesso na última missão.
export function shouldUnlockNext(
  currentUnlocked: BloomLevel,
  topLevelAccuracy: number,
  topLevelAttempts: number,
): BloomLevel {
  if (currentUnlocked >= 4) return 4;
  if (topLevelAttempts < 3) return currentUnlocked; // amostra pequena
  if (topLevelAccuracy >= UNLOCK_THRESHOLD) {
    return (currentUnlocked + 1) as BloomLevel;
  }
  return currentUnlocked;
}

// Ordena questões por nível Bloom crescente (fácil → difícil).
// Mantém a ordem original dentro de cada nível.
export function sortByBloomAsc<T extends { bloom_level?: number | null }>(items: T[]): T[] {
  return items.slice().sort((a, b) => (a.bloom_level ?? 1) - (b.bloom_level ?? 1));
}

// Garante que a missão tem pelo menos 2 níveis diferentes (se possível dado
// o pool disponível). Recebe a sequência ordenada e devolve-a inalterada
// quando válida; caso contrário, sinaliza para o caller injetar variedade.
export function hasMultipleLevels<T extends { bloom_level?: number | null }>(items: T[]): boolean {
  const set = new Set(items.map((q) => q.bloom_level ?? 1));
  return set.size >= 2;
}

// Reagrupa o pool de uma disciplina em sub-pools por nível Bloom,
// já filtrando os níveis que o aluno ainda não desbloqueou.
export function poolByLevel<T extends { bloom_level?: number | null }>(
  items: T[],
  unlocked: BloomLevel,
): Record<BloomLevel, T[]> {
  const out: Record<BloomLevel, T[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const it of items) {
    const lvl = Math.min(4, Math.max(1, (it.bloom_level ?? 1) as number)) as BloomLevel;
    if (lvl <= unlocked) out[lvl].push(it);
  }
  return out;
}

// Plano de níveis para a missão: do mais fácil ao mais alto desbloqueado.
// Garante progressão fácil → difícil.
export function plannedLevels(unlocked: BloomLevel): BloomLevel[] {
  const arr: BloomLevel[] = [];
  for (let i = 1; i <= unlocked; i++) arr.push(i as BloomLevel);
  return arr;
}
