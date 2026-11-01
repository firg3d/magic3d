"use client";

/*
 * Sectiunile modului Pictura din etapa 3: selectia (dreptunghi / lasou), retusarea modelului
 * (subdivizare locala, reparare, simplificare) si imaginea pe model. Doar afisare; logica e in
 * ModPictura.
 */
import { t } from "@/magic3d/core/i18n/index";

export type ModSelectie = "dreptunghi" | "lasou";

export function SectiuneSelectie(p: {
  mod: ModSelectie;
  prin: boolean;
  selectate: number;
  onMod: (m: ModSelectie) => void;
  onPrin: (v: boolean) => void;
  onCuloare: () => void;
  onTot: () => void;
  onInverseaza: () => void;
  onGoleste: () => void;
}) {
  return (
    <div className="m3d-pictura-grup" data-testid="pictura-selectie">
      <label className="m3d-pictura-camp">
        <span>{t("pictura.formaSelectiei")}</span>
        <select value={p.mod} data-testid="pictura-selectie-mod" onChange={(e) => p.onMod(e.target.value as ModSelectie)}>
          <option value="dreptunghi">{t("pictura.dreptunghi")}</option>
          <option value="lasou">{t("pictura.lasou")}</option>
        </select>
      </label>
      <label className="m3d-pictura-bifa">
        <input type="checkbox" checked={p.prin} data-testid="pictura-selectie-prin" onChange={(e) => p.onPrin(e.target.checked)} />
        {t("pictura.selectiePrin")}
      </label>
      <p className="m3d-pictura-nota" role="status">{t("pictura.selectate", { n: p.selectate.toLocaleString() })}</p>
      <p className="m3d-pictura-nota">{t("pictura.selectieTaste")}</p>
      <button type="button" className="m3d-pictura-buton" data-testid="pictura-selectie-culoare" disabled={!p.selectate} onClick={p.onCuloare}>{t("pictura.culoarePeSelectie")}</button>
      <div className="m3d-pictura-istoric">
        <button type="button" data-testid="pictura-selectie-tot" onClick={p.onTot}>{t("pictura.selecteazaTot")}</button>
        <button type="button" data-testid="pictura-selectie-inverseaza" onClick={p.onInverseaza}>{t("pictura.inverseaza")}</button>
      </div>
      <button type="button" className="m3d-pictura-buton" data-testid="pictura-selectie-goleste" disabled={!p.selectate} onClick={p.onGoleste}>{t("pictura.golesteSelectia")}</button>
    </div>
  );
}

export function SectiuneRetusare(p: {
  triunghiuri: number;
  maxim: number;
  marimeFisier: string;
  lungime: number;
  lungimeMax: number;
  selectate: number;
  ocupat: boolean;
  onLungime: (v: number) => void;
  onSubdivizeaza: () => void;
  onRepara: () => void;
  onSimplifica: (fractie: number) => void;
}) {
  const mare = p.triunghiuri > p.maxim * 0.75;
  return (
    <details className="m3d-pictura-sectiune" data-testid="pictura-retusare" open={mare || undefined}>
      <summary>{t("pictura.retusare")}</summary>
      <p className={`m3d-pictura-limita ${mare ? "peste" : ""}`} role="status">
        {t("pictura.triunghiuriFisier", { n: p.triunghiuri.toLocaleString(), m: p.marimeFisier })}
        {mare ? <><br />{t("pictura.modelMare")}</> : null}
      </p>
      <label className="m3d-pictura-camp">
        <span>{t("pictura.laturaMax")} <output>{p.lungime.toFixed(1)} mm</output></span>
        <input type="range" min={0.2} max={p.lungimeMax} step={0.1} value={p.lungime} data-testid="pictura-latura" onChange={(e) => p.onLungime(Number(e.target.value))} />
      </label>
      <button type="button" className="m3d-pictura-buton" data-testid="pictura-subdivizeaza" disabled={p.ocupat} onClick={p.onSubdivizeaza}>
        {p.selectate ? t("pictura.subdivizeazaSelectia") : t("pictura.subdivizeazaTot")}
      </button>
      <p className="m3d-pictura-nota">{t("pictura.subdivizareNota", { m: p.maxim.toLocaleString() })}</p>
      <button type="button" className="m3d-pictura-buton" data-testid="pictura-repara" disabled={p.ocupat} onClick={p.onRepara}>{t("pictura.repara")}</button>
      <p className="m3d-pictura-nota">{t("pictura.reparaNota")}</p>
      <div className="m3d-pictura-rand">
        <span className="m3d-pictura-nota">{t("pictura.simplifica")}</span>
        {[0.5, 0.25, 0.1].map((f) => (
          <button key={f} type="button" className="m3d-pictura-buton mic" data-testid={`pictura-simplifica-${Math.round(f * 100)}`} disabled={p.ocupat} onClick={() => p.onSimplifica(f)}>
            {Math.round(f * 100)}%
          </button>
        ))}
      </div>
      <p className="m3d-pictura-nota">{t("pictura.simplificaNota")}</p>
    </details>
  );
}

export type SursaImagine = "atelier" | "sloturi";

export function SectiuneImagine(p: {
  incarcata: { nume: string; original: string; redusa: string | null; culori: string[] } | null;
  culori: number;
  culoriMax: number;
  sursa: SursaImagine;
  fundal: boolean;
  plasata: boolean;
  latime: number;
  latimeMax: number;
  rotire: number;
  mutare: [number, number];
  onFisier: (f: File) => void;
  onCulori: (n: number) => void;
  onSursa: (s: SursaImagine) => void;
  onFundal: (v: boolean) => void;
  onPlaseaza: () => void;
  onLatime: (v: number) => void;
  onRotire: (v: number) => void;
  onMutare: (v: [number, number]) => void;
  onAplica: () => void;
  onRenunta: () => void;
}) {
  return (
    <details className="m3d-pictura-sectiune" data-testid="pictura-imagine" open={p.incarcata ? true : undefined}>
      <summary>{t("pictura.imaginePeModel")}</summary>
      <p className="m3d-pictura-nota m3d-pictura-drepturi">{t("pictura.drepturi")}</p>
      <label className="m3d-pictura-buton m3d-pictura-fisier">
        {p.incarcata ? t("pictura.altaImagine") : t("pictura.incarcaImagine")}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg" data-testid="pictura-imagine-fisier"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onFisier(f); e.target.value = ""; }} />
      </label>
      {p.incarcata ? (
        <>
          <div className="m3d-pictura-inainte-dupa">
            <figure><img src={p.incarcata.original} alt={t("pictura.imagineOriginala", { nume: p.incarcata.nume })} /><figcaption>{t("pictura.inainte")}</figcaption></figure>
            <figure>{p.incarcata.redusa ? <img src={p.incarcata.redusa} alt={t("pictura.imagineRedusa")} data-testid="pictura-imagine-redusa" /> : null}<figcaption>{t("pictura.dupa", { n: p.incarcata.culori.length })}</figcaption></figure>
          </div>
          <label className="m3d-pictura-camp">
            <span>{t("pictura.culoriImagine")}</span>
            <select value={p.culori} data-testid="pictura-imagine-culori" onChange={(e) => p.onCulori(Number(e.target.value))}>
              {Array.from({ length: Math.max(1, p.culoriMax - 1) }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="m3d-pictura-camp">
            <span>{t("pictura.culoriDin")}</span>
            <select value={p.sursa} data-testid="pictura-imagine-sursa" onChange={(e) => p.onSursa(e.target.value as SursaImagine)}>
              <option value="atelier">{t("pictura.sursaAtelier")}</option>
              <option value="sloturi">{t("pictura.sloturileActuale")}</option>
            </select>
          </label>
          <label className="m3d-pictura-bifa">
            <input type="checkbox" checked={p.fundal} data-testid="pictura-imagine-fundal" onChange={(e) => p.onFundal(e.target.checked)} />
            {t("pictura.faraFundal")}
          </label>
          <button type="button" className="m3d-pictura-buton" data-testid="pictura-imagine-plaseaza" onClick={p.onPlaseaza}>{t("pictura.plaseaza")}</button>
          {p.plasata ? (
            <>
              <label className="m3d-pictura-camp">
                <span>{t("pictura.latimeImagine")} <output>{p.latime.toFixed(0)} mm</output></span>
                <input type="range" min={2} max={p.latimeMax} step={0.5} value={p.latime} data-testid="pictura-imagine-latime" onChange={(e) => p.onLatime(Number(e.target.value))} />
              </label>
              <label className="m3d-pictura-camp">
                <span>{t("pictura.rotire")} <output>{p.rotire}°</output></span>
                <input type="range" min={-180} max={180} step={1} value={p.rotire} data-testid="pictura-imagine-rotire" onChange={(e) => p.onRotire(Number(e.target.value))} />
              </label>
              <label className="m3d-pictura-camp">
                <span>{t("pictura.mutareX")} <output>{p.mutare[0].toFixed(0)} mm</output></span>
                <input type="range" min={-p.latimeMax / 2} max={p.latimeMax / 2} step={0.5} value={p.mutare[0]} data-testid="pictura-imagine-x" onChange={(e) => p.onMutare([Number(e.target.value), p.mutare[1]])} />
              </label>
              <label className="m3d-pictura-camp">
                <span>{t("pictura.mutareY")} <output>{p.mutare[1].toFixed(0)} mm</output></span>
                <input type="range" min={-p.latimeMax / 2} max={p.latimeMax / 2} step={0.5} value={p.mutare[1]} data-testid="pictura-imagine-y" onChange={(e) => p.onMutare([p.mutare[0], Number(e.target.value)])} />
              </label>
              <div className="m3d-pictura-istoric">
                <button type="button" className="principal" data-testid="pictura-imagine-aplica" onClick={p.onAplica}>{t("pictura.aplicaImaginea")}</button>
                <button type="button" data-testid="pictura-imagine-renunta" onClick={p.onRenunta}>{t("pictura.renunta")}</button>
              </div>
            </>
          ) : <p className="m3d-pictura-nota">{t("pictura.plaseazaNota")}</p>}
        </>
      ) : null}
    </details>
  );
}
