"use client";

import { Printer } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { to } from "@/magic3d/oferta/texte";

/** Evenimentul pe care editorul il asculta ca sa deschida panoul de oferta. */
export const DESCHIDE_OFERTA = "magic3d:open-oferta";

/** Butonul din bara de titlu a editorului: "Printeaza in Romania - cere oferta". */
export function OfertaButton() {
  useLanguage();
  return (
    <button
      type="button"
      className="magic3d-oferta-button"
      title={to("buton")}
      onClick={() => window.dispatchEvent(new Event(DESCHIDE_OFERTA))}
    >
      <Printer size={16} aria-hidden="true" />
      <span className="lung">{to("buton")}</span>
      <span className="scurt">{to("butonScurt")}</span>
    </button>
  );
}
