import { CULORI_TURTA, FONTURI_CRACIUN, FORME_TURTA, NIVELURI_TURTA, PATURI, TURTA } from "@/magic3d/apps/craciun/config";
import { listaNume } from "@/magic3d/apps/craciun/pachet";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef } from "@/magic3d/generatoare/tipuri";

/* Turta dulce, ornament glazurat din sabloane desenate (colectia "Craciun"). Limitele vin din apps/craciun/config.ts. */

export const TURTA_DULCE_DEF: GeneratorDef = {
  id: "turta-dulce",
  titlu: "comutator.turtaDulce",
  versiune: 3,
  categorie: "craciun",
  implicit: {
    forma: "om",
    marime: TURTA.marime,
    grosimeBaza: TURTA.grosimeBaza,
    culoareBaza: CULORI_TURTA.baza,
    nivel: "mediu",
    distantaCordon: TURTA.distantaCordon,
    latimeCordon: TURTA.latimeCordon,
    inaltimeCordon: TURTA.inaltimeCordon,
    culoareGlazura: CULORI_TURTA.glazura,
    treiCulori: false,
    culoareDetalii: CULORI_TURTA.detalii,
    ochi: "inchis",
    culoareOchi: CULORI_TURTA.ochi,
    obraji: true,
    culoareObraji: CULORI_TURTA.obraji,
    text: "Ana",
    font: FONTURI_CRACIUN.rotunjite[0],
    lista: "",
    pat: "180",
  },
  parametri: [
    { cheie: "forma", tip: "alegere", eticheta: "turta.forma", grup: "turta.grupForma", optiuni: FORME_TURTA.map((f) => ({ valoare: f, eticheta: `turta.forma_${f}` })) },
    { cheie: "marime", tip: "numar", eticheta: "turta.marime", grup: "turta.grupForma", min: TURTA.marimeMin, max: TURTA.marimeMax, pas: 1 },
    { cheie: "grosimeBaza", tip: "numar", eticheta: "turta.grosimeBaza", grup: "turta.grupForma", min: TURTA.grosimeBazaMin, max: TURTA.grosimeBazaMax, pas: 0.1 },
    { cheie: "culoareBaza", tip: "culoare", eticheta: "turta.culoareBaza", grup: "turta.grupForma" },
    { cheie: "nivel", tip: "alegere", eticheta: "turta.nivel", grup: "turta.grupGlazura", optiuni: NIVELURI_TURTA.map((v) => ({ valoare: v, eticheta: `turta.nivel_${v}` })) },
    { cheie: "distantaCordon", tip: "numar", eticheta: "turta.distantaCordon", grup: "turta.grupGlazura", min: TURTA.distantaCordonMin, max: TURTA.distantaCordonMax, pas: 0.1 },
    { cheie: "latimeCordon", tip: "numar", eticheta: "turta.latimeCordon", grup: "turta.grupGlazura", min: TURTA.latimeCordonMin, max: TURTA.latimeCordonMax, pas: 0.1 },
    { cheie: "inaltimeCordon", tip: "numar", eticheta: "turta.inaltimeCordon", grup: "turta.grupGlazura", min: TURTA.inaltimeCordonMin, max: TURTA.inaltimeCordonMax, pas: 0.05 },
    { cheie: "culoareGlazura", tip: "culoare", eticheta: "turta.culoareGlazura", grup: "turta.grupGlazura" },
    { cheie: "treiCulori", tip: "bifa", eticheta: "turta.treiCulori", grup: "turta.grupGlazura" },
    { cheie: "culoareDetalii", tip: "culoare", eticheta: "turta.culoareDetalii", grup: "turta.grupGlazura", vizibil: (p) => p.treiCulori === true },
    { cheie: "ochi", tip: "alegere", eticheta: "turta.ochi", grup: "turta.grupGlazura", optiuni: [{ valoare: "alb", eticheta: "turta.ochi_alb" }, { valoare: "inchis", eticheta: "turta.ochi_inchis" }] },
    { cheie: "culoareOchi", tip: "culoare", eticheta: "turta.culoareOchi", grup: "turta.grupGlazura", vizibil: (p) => p.ochi === "inchis" },
    { cheie: "obraji", tip: "bifa", eticheta: "turta.obraji", grup: "turta.grupGlazura" },
    { cheie: "culoareObraji", tip: "culoare", eticheta: "turta.culoareObraji", grup: "turta.grupGlazura", vizibil: (p) => p.obraji === true },
    { cheie: "text", tip: "text", eticheta: "turta.text", grup: "turta.grupNume" },
    { cheie: "font", tip: "font", eticheta: "turta.font", grup: "turta.grupNume", fonturi: { "globNume.fonturiRotunjite": FONTURI_CRACIUN.rotunjite, "globNume.fonturiScript": FONTURI_CRACIUN.script, "globNume.fonturiBloc": FONTURI_CRACIUN.bloc } },
    { cheie: "lista", tip: "text", randuri: 6, eticheta: "globNume.lista", grup: "globNume.grupPachet" },
    { cheie: "pat", tip: "alegere", eticheta: "globNume.pat", grup: "globNume.grupPachet", optiuni: PATURI.map((v) => ({ valoare: String(v), eticheta: `globNume.pat_${v}` })) },
  ],
  instructiuni: () => t("turta.instructiuni"),
  bucati: (p) => Math.max(1, listaNume(String(p.lista ?? "")).length),
  pat: (p) => (Number(p.pat) === 256 ? 256 : 180),
};
