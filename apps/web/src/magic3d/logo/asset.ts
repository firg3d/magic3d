import type { ToolbarShapeAsset } from "@/lib/shapeCatalog";
import { tl } from "@/magic3d/logo/texte";

/** Evenimentul pe care editorul il asculta ca sa deschida panoul "Din poză sau logo". */
export const DESCHIDE_LOGO = "magic3d:open-logo";

/**
 * Intrarea din biblioteca de forme: ca eticheta cu iconita si codul QR, nu pune o forma, ci deschide
 * panoul. Numele vine din textele Magic3D (getter), nu din catalogul layerling cu 20 de limbi.
 */
export const logoAsset: ToolbarShapeAsset = {
  id: "magic3dLogo",
  get name() {
    return tl("titlu");
  },
  src: "magic3d/logo/logo-icon.svg",
  menuIcon: "magic3d/logo/logo-icon.svg",
  kind: "text",
  color: "#1f8a5b",
};
