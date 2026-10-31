"use client";

import { Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { tg } from "@/magic3d/generatoare/texte";

/** Evenimentul pe care editorul il asculta ca sa deschida panoul generatoarelor. */
export const DESCHIDE_GENERATOARE = "magic3d:open-generatoare";

/** Butonul "Generatoare" din bara de titlu a editorului. */
export function GeneratoareButton() {
  useLanguage();
  return (
    <button type="button" className="magic3d-generatoare-button" title={tg("titlu")} onClick={() => window.dispatchEvent(new Event(DESCHIDE_GENERATOARE))}>
      <Sparkles size={16} aria-hidden="true" />
      <span>{tg("buton")}</span>
    </button>
  );
}
