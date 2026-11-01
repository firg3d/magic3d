"use client";

/*
 * Sectiunile panoului din dreapta ale modului Pictura care tin de etapa 2: imprimanta si limita de
 * culori, modelele de culoare, reducerea de culori si estimarile. Doar afisare; logica e in
 * ModPictura.
 */
import { useState } from "react";
import { limba, t } from "@/magic3d/core/i18n/index";
import { IMPRIMANTE, type Estimare, type SistemMulticolor } from "@/magic3d/pictura/imprimante";
import { CULORI_MODEL_MAX, MODELE, PROIECTII, type Model, type ParametriModel, type Proiectie } from "@/magic3d/pictura/modele";
import { filamentAtelier } from "@/magic3d/pictura/paleta";
import type { ModelulMeu, PresetareModel } from "@/magic3d/pictura/presetari";

const numeSlot = (hex: string, i: number) => {
  const f = filamentAtelier(hex);
  return `${i + 1} · ${f ? f.nume : hex.toUpperCase()}`;
};

export function SectiuneImprimanta(p: {
  sistem: SistemMulticolor;
  unitati: number;
  manual: number | null;
  limita: number;
  folosite: number;
  onSistem: (id: string) => void;
  onUnitati: (n: number) => void;
  onManual: (n: number | null) => void;
}) {
  const l = limba();
  return (
    <details className="m3d-pictura-sectiune" open>
      <summary>{t("pictura.imprimanta")}</summary>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.sistem")}</span>
        <select value={p.sistem.id} data-testid="pictura-sistem" onChange={(e) => p.onSistem(e.target.value)}>
          {IMPRIMANTE.sisteme.map((s) => <option key={s.id} value={s.id}>{s.nume[l]}</option>)}
        </select>
      </label>
      {p.sistem.unitatiMax > 1 ? (
        <label className="m3d-pictura-camp">
          <span>{t("pictura.unitati")}</span>
          <select value={p.unitati} data-testid="pictura-unitati" onChange={(e) => p.onUnitati(Number(e.target.value))}>
            {Array.from({ length: p.sistem.unitatiMax }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{t("pictura.unitatiN", { n, c: n * p.sistem.culoriPeUnitate })}</option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="m3d-pictura-camp">
        <span>{t("pictura.numarCulori")}</span>
        <select value={p.manual ?? "auto"} data-testid="pictura-limita" onChange={(e) => p.onManual(e.target.value === "auto" ? null : Number(e.target.value))}>
          <option value="auto">{t("pictura.dupaImprimanta", { n: p.limita })}</option>
          {IMPRIMANTE.alegeriManuale.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <p className={`m3d-pictura-limita ${p.folosite > p.limita ? "peste" : ""}`} data-testid="pictura-limita-stare" role="status">
        {p.folosite > p.limita ? t("pictura.pesteLimita", { n: p.folosite, m: p.limita }) : t("pictura.inLimita", { n: p.folosite, m: p.limita })}
      </p>
    </details>
  );
}

export type TintaModel = "tot" | number;

export function SectiuneModele(p: {
  parametri: ParametriModel;
  culoriModel: string[];
  sloturi: string[];
  presetareId: string;
  presetari: PresetareModel[];
  modeleleMele: ModelulMeu[];
  tinta: TintaModel;
  progres: number | null;
  onParametri: (p: ParametriModel) => void;
  onCulori: (c: string[]) => void;
  onPresetare: (id: string) => void;
  onTinta: (t: TintaModel) => void;
  onAplica: () => void;
  onAnuleaza: () => void;
  onSalveaza: (nume: string) => void;
  onSterge: (id: string) => void;
}) {
  const l = limba();
  const [nume, setNume] = useState("");
  const set = <K extends keyof ParametriModel>(k: K, v: ParametriModel[K]) => p.onParametri({ ...p.parametri, [k]: v });
  const alesulMeu = p.modeleleMele.find((m) => m.id === p.presetareId);
  return (
    <details className="m3d-pictura-sectiune">
      <summary>{t("pictura.modele")}</summary>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.presetare")}</span>
        <select value={p.presetareId} data-testid="pictura-presetare" onChange={(e) => p.onPresetare(e.target.value)}>
          <option value="">{t("pictura.modelPropriu")}</option>
          <optgroup label={t("pictura.presetari")}>
            {p.presetari.map((x) => <option key={x.id} value={x.id}>{x.nume[l]}</option>)}
          </optgroup>
          {p.modeleleMele.length ? (
            <optgroup label={t("pictura.modeleleMele")}>
              {p.modeleleMele.map((x) => <option key={x.id} value={x.id}>{x.nume}</option>)}
            </optgroup>
          ) : null}
        </select>
      </label>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.model")}</span>
        <select value={p.parametri.model} data-testid="pictura-model" onChange={(e) => set("model", e.target.value as Model)}>
          {MODELE.map((m) => <option key={m} value={m}>{t(`pictura.m.${m}`)}</option>)}
        </select>
      </label>
      {p.parametri.model !== "spirala" ? (
        <label className="m3d-pictura-camp">
          <span>{t("pictura.proiectie")}</span>
          <select value={p.parametri.proiectie} data-testid="pictura-proiectie" onChange={(e) => set("proiectie", e.target.value as Proiectie)}>
            {PROIECTII.map((x) => <option key={x} value={x}>{t(`pictura.pr.${x}`)}</option>)}
          </select>
        </label>
      ) : null}
      <label className="m3d-pictura-camp">
        <span>{t("pictura.marimeModel")} <output>{p.parametri.marime} mm</output></span>
        <input type="range" min={0.5} max={60} step={0.5} value={p.parametri.marime} data-testid="pictura-model-marime" onChange={(e) => set("marime", Number(e.target.value))} />
      </label>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.unghiModel")} <output>{p.parametri.unghi}°</output></span>
        <input type="range" min={0} max={180} step={5} value={p.parametri.unghi} data-testid="pictura-model-unghi" onChange={(e) => set("unghi", Number(e.target.value))} />
      </label>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.densitate")} <output>{Math.round(p.parametri.densitate * 100)}%</output></span>
        <input type="range" min={0.1} max={1} step={0.05} value={p.parametri.densitate} data-testid="pictura-model-densitate" onChange={(e) => set("densitate", Number(e.target.value))} />
      </label>
      <div className="m3d-pictura-rand">
        <label className="m3d-pictura-camp">
          <span>{t("pictura.seed")}</span>
          <input type="text" inputMode="numeric" maxLength={5} value={String(p.parametri.seed)} data-testid="pictura-model-seed" onChange={(e) => set("seed", Math.min(99999, Math.max(0, parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)))} />
        </label>
        <button type="button" className="m3d-pictura-buton mic" data-testid="pictura-model-aleator" title={t("pictura.aleator")} aria-label={t("pictura.aleator")}
          onClick={() => set("seed", Math.floor(Math.random() * 99999))}>⚄</button>
      </div>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.culoriModel")}</span>
        <select value={p.parametri.culori} data-testid="pictura-model-culori" onChange={(e) => {
          const k = Number(e.target.value);
          p.onParametri({ ...p.parametri, culori: k });
          p.onCulori(Array.from({ length: k }, (_, i) => p.culoriModel[i] ?? p.sloturi[i % p.sloturi.length]));
        }}>
          {Array.from({ length: CULORI_MODEL_MAX - 1 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <ol className="m3d-pictura-culori-model">
        {p.culoriModel.slice(0, p.parametri.culori).map((hex, i) => {
          const optiuni = [...new Set([...p.sloturi, hex])];
          return (
            <li key={i}>
              <span className="m3d-pictura-mostra" style={{ background: hex }} />
              <select value={hex} data-testid={`pictura-model-culoare-${i + 1}`} aria-label={t("pictura.culoareNivel", { n: i + 1 })}
                onChange={(e) => p.onCulori(p.culoriModel.map((c, j) => (j === i ? e.target.value : c)))}>
                {optiuni.map((h) => {
                  const k = p.sloturi.indexOf(h);
                  return <option key={h} value={h}>{k >= 0 ? numeSlot(h, k) : `${t("pictura.culoareNoua")} ${filamentAtelier(h)?.nume ?? h.toUpperCase()}`}</option>;
                })}
              </select>
            </li>
          );
        })}
      </ol>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.aplicaPe")}</span>
        <select value={String(p.tinta)} data-testid="pictura-model-tinta" onChange={(e) => p.onTinta(e.target.value === "tot" ? "tot" : Number(e.target.value))}>
          <option value="tot">{t("pictura.totCorpul")}</option>
          {p.sloturi.map((h, i) => <option key={i} value={i}>{t("pictura.doarPeSlot", { n: numeSlot(h, i) })}</option>)}
        </select>
      </label>
      {p.progres === null ? (
        <button type="button" className="m3d-pictura-buton principal" data-testid="pictura-model-aplica" onClick={p.onAplica}>{t("pictura.aplicaModel")}</button>
      ) : (
        <div className="m3d-pictura-progres" role="status">
          <progress max={1} value={p.progres} aria-label={t("pictura.calculez")} />
          <button type="button" className="m3d-pictura-buton" data-testid="pictura-model-anuleaza" onClick={p.onAnuleaza}>{t("pictura.anuleazaCalcul")}</button>
        </div>
      )}
      <div className="m3d-pictura-rand">
        <input type="text" value={nume} maxLength={40} placeholder={t("pictura.numeModel")} aria-label={t("pictura.numeModel")} data-testid="pictura-model-nume" onChange={(e) => setNume(e.target.value)} />
        <button type="button" className="m3d-pictura-buton mic" data-testid="pictura-model-salveaza" disabled={!nume.trim()} onClick={() => { p.onSalveaza(nume.trim()); setNume(""); }}>{t("pictura.salveaza")}</button>
      </div>
      {alesulMeu ? (
        <button type="button" className="m3d-pictura-buton" data-testid="pictura-model-sterge" onClick={() => p.onSterge(alesulMeu.id)}>{t("pictura.stergeModel", { nume: alesulMeu.nume })}</button>
      ) : null}
    </details>
  );
}

export type SursaReducere = "folosite" | "atelier";

export function SectiuneReducere(p: {
  sloturi: string[];
  ponderi: number[];
  limita: number;
  sursa: SursaReducere;
  fixate: Set<number>;
  previzualizare: boolean;
  deschisa: boolean;
  onSursa: (s: SursaReducere) => void;
  onFixeaza: (slot: number) => void;
  onPrevizualizare: (on: boolean) => void;
  onAplica: () => void;
  onUneste: (din: number, inSlot: number) => void;
}) {
  const [din, setDin] = useState(1);
  const [inSlot, setInSlot] = useState(0);
  const valid = din !== inSlot && din < p.sloturi.length && inSlot < p.sloturi.length;
  return (
    <details className="m3d-pictura-sectiune" open={p.deschisa || undefined}>
      <summary>{t("pictura.reducere")}</summary>
      <p className="m3d-pictura-nota">{t("pictura.reducereNota", { m: p.limita })}</p>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.reducereSursa")}</span>
        <select value={p.sursa} data-testid="pictura-reducere-sursa" onChange={(e) => p.onSursa(e.target.value as SursaReducere)}>
          <option value="folosite">{t("pictura.sursaFolosite")}</option>
          <option value="atelier">{t("pictura.sursaAtelier")}</option>
        </select>
      </label>
      <fieldset className="m3d-pictura-fixate">
        <legend>{t("pictura.fixeaza")}</legend>
        {p.sloturi.map((h, i) => (
          <label key={i} className="m3d-pictura-bifa">
            <input type="checkbox" checked={p.fixate.has(i)} data-testid={`pictura-fixeaza-${i + 1}`} disabled={!p.ponderi[i]} onChange={() => p.onFixeaza(i)} />
            <span className="m3d-pictura-mostra mica" style={{ background: h }} />
            {numeSlot(h, i)}
          </label>
        ))}
      </fieldset>
      <label className="m3d-pictura-bifa">
        <input type="checkbox" checked={p.previzualizare} data-testid="pictura-reducere-previzualizare" onChange={(e) => p.onPrevizualizare(e.target.checked)} />
        {t("pictura.inainteDupa")}
      </label>
      <button type="button" className="m3d-pictura-buton principal" data-testid="pictura-reducere-aplica" onClick={p.onAplica}>{t("pictura.aplicaReducerea", { m: p.limita })}</button>
      <div className="m3d-pictura-uneste">
        <span>{t("pictura.uneste")}</span>
        <select value={din} data-testid="pictura-uneste-din" aria-label={t("pictura.unesteDin")} onChange={(e) => setDin(Number(e.target.value))}>
          {p.sloturi.map((h, i) => <option key={i} value={i}>{numeSlot(h, i)}</option>)}
        </select>
        <span>→</span>
        <select value={inSlot} data-testid="pictura-uneste-in" aria-label={t("pictura.unesteIn")} onChange={(e) => setInSlot(Number(e.target.value))}>
          {p.sloturi.map((h, i) => <option key={i} value={i}>{numeSlot(h, i)}</option>)}
        </select>
        <button type="button" className="m3d-pictura-buton mic" data-testid="pictura-uneste" disabled={!valid} onClick={() => p.onUneste(din, inSlot)}>{t("pictura.unesteButon")}</button>
      </div>
    </details>
  );
}

function durata(secunde: number) {
  const m = Math.round(secunde / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export function SectiuneEstimari({ estimare, sistem }: { estimare: Estimare; sistem: SistemMulticolor }) {
  const fara = sistem.culoriPeUnitate * sistem.unitatiMax <= 1;
  return (
    <details className="m3d-pictura-sectiune" open>
      <summary>{t("pictura.estimari")}</summary>
      {fara ? <p className="m3d-pictura-nota">{t("pictura.faraSistem")}</p> : (
        <dl className="m3d-pictura-estimari" data-testid="pictura-estimari">
          <div><dt>{t("pictura.schimbari")}</dt><dd>~{estimare.schimbari.toLocaleString()}</dd></div>
          <div><dt>{t("pictura.materialPierdut")}</dt><dd>~{estimare.grame.toLocaleString()} g</dd></div>
          <div><dt>{t("pictura.timpSuplimentar")}</dt><dd>~{durata(estimare.secunde)}</dd></div>
        </dl>
      )}
      <p className="m3d-pictura-nota">{t("pictura.estimariNota")}</p>
    </details>
  );
}
