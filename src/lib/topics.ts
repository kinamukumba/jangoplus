// Lista curada de tópicos por disciplina. Usada para agrupar a missão diária
// em micro-blocos visíveis ao aluno.
import type { SubjectCode } from "./sekulo-config";

export const CURATED_TOPICS: Record<SubjectCode, string[]> = {
  MAT: ["Funções", "Derivadas", "Geometria", "Álgebra", "Revisão"],
  FIS: ["Cinemática", "Dinâmica", "Eletricidade", "Ondas", "Revisão"],
  QUI: ["Estequiometria", "Soluções", "Orgânica", "Termoquímica", "Revisão"],
  BIO: ["Citologia", "Genética", "Fisiologia", "Ecologia", "Revisão"],
  LP:  ["Interpretação", "Gramática", "Redação", "Revisão"],
  REV: ["Revisão"],
};

export function topicsFor(code: SubjectCode): string[] {
  return CURATED_TOPICS[code] ?? ["Revisão"];
}
