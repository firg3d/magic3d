/*
 * Presetarile de culoare (model + culori) din presetari-modele.json si "Modelele mele", salvate
 * de utilizator in browser, ca formele proprii.
 */
import date from "@/magic3d/pictura/presetari-modele.json";
import { CULORI_MODEL_MAX, esteParametriModel, type ParametriModel } from "@/magic3d/pictura/modele";

export type PresetareModel = { id: string; nume: { ro: string; en: string }; parametri: ParametriModel; culori: string[] };
export type ModelulMeu = { id: string; nume: string; parametri: ParametriModel; culori: string[] };

const HEX = /^#[0-9a-f]{6}$/i;

function estePresetare(v: unknown): v is PresetareModel {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  const nume = p.nume as Record<string, unknown> | undefined;
  return typeof p.id === "string" && typeof nume?.ro === "string" && typeof nume?.en === "string" && esteParametriModel(p.parametri)
    && Array.isArray(p.culori) && p.culori.length >= 1 && p.culori.length <= CULORI_MODEL_MAX && p.culori.every((c) => typeof c === "string" && HEX.test(c))
    && p.culori.length >= (p.parametri as ParametriModel).culori;
}

const lista = (date as { presetari: unknown[] }).presetari;
if (!Array.isArray(lista) || !lista.every(estePresetare)) throw new Error("presetari-modele.json nu are structura asteptata");
export const PRESETARI: PresetareModel[] = lista as PresetareModel[];

const CHEIE = "magic3d.pictura.modele";

function esteModelulMeu(v: unknown): v is ModelulMeu {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return typeof m.id === "string" && typeof m.nume === "string" && esteParametriModel(m.parametri)
    && Array.isArray(m.culori) && m.culori.every((c) => typeof c === "string" && HEX.test(c));
}

export function modeleleMele(stocare: Pick<Storage, "getItem"> | null = typeof localStorage === "undefined" ? null : localStorage): ModelulMeu[] {
  try {
    const v: unknown = JSON.parse(stocare?.getItem(CHEIE) ?? "[]");
    return Array.isArray(v) ? v.filter(esteModelulMeu) : [];
  } catch {
    return [];
  }
}

export function salveazaModelulMeu(
  model: Omit<ModelulMeu, "id">,
  stocare: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage,
): ModelulMeu[] {
  const nou: ModelulMeu = { ...model, id: `m${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}` };
  const toate = [...modeleleMele(stocare).filter((m) => m.nume !== model.nume), nou];
  try { stocare?.setItem(CHEIE, JSON.stringify(toate)); } catch { /* stocare plina sau blocata: modelul ramane doar acum */ }
  return toate;
}

export function stergeModelulMeu(
  id: string,
  stocare: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage,
): ModelulMeu[] {
  const toate = modeleleMele(stocare).filter((m) => m.id !== id);
  try { stocare?.setItem(CHEIE, JSON.stringify(toate)); } catch { /* idem */ }
  return toate;
}
