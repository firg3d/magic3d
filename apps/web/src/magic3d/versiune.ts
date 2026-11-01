/*
 * Versiunea Magic3D aratata langa logo ("2.0"): primele doua numere ale versiunii programului,
 * din acelasi loc din care o citesc proiectele (.lyl) si nota de versiune.
 */
import { LYL_CREATED_WITH_VERSION } from "@/lib/lylProject";

export const VERSIUNE_MAGIC3D = LYL_CREATED_WITH_VERSION.split(".").slice(0, 2).join(".");
