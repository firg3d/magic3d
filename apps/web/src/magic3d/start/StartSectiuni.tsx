"use client";

import { FolderOpen, Search, Sparkles, Upload } from "lucide-react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { t } from "@/lib/i18n";
import { LANGUAGE_INFO } from "@/lib/languages";
import { libraryShapeAssets } from "@/lib/shapeCatalog";
import { useLanguage } from "@/lib/useLanguage";
import { DESCHIDE_GENERATOARE } from "@/magic3d/generatoare/GeneratoareButton";
import { START, tx } from "@/magic3d/start/config";
import { noteazaFormaInitiala } from "@/magic3d/start/formaInitiala";
import { tst } from "@/magic3d/start/texte";

/*
 * Butonul de creare si cardul de import iau textul din catalogul interfetei (dashboard.*), pe care il citeste si ghidul.
 *
 * Sectiunile noi ale paginii de start Magic3D (macheta "Pagina de start"). Nu tin stare proprie:
 * cautarea, crearea, continuarea si importul sunt functiile existente ale paginii, primite ca props.
 */

const ghid = (limba: string) => `/${LANGUAGE_INFO[limba as keyof typeof LANGUAGE_INFO]?.guideDir ?? "guide"}/index.html`;

/** Header: logo, navigare, cautare in proiecte, tema, limba, "Proiectele mele", "Deschide editorul". */
export function StartHeader({ query, onQueryChange, onOpenEditor, searchLabel, searchPlaceholder }: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenEditor: () => void;
  searchLabel: string;
  searchPlaceholder: string;
}) {
  const limba = useLanguage();
  return (
    <header className="m3d-header">
      <a className="m3d-brand" href="./" aria-label="Magic3D">
        <img src="/assets/magic3d/magic3d-logo.svg" alt="" width={36} height={36} />
        <span className="m3d-brand-nume">Magic3D</span>
        <span className="m3d-brand-eticheta">{tst("dePraktik")}</span>
      </a>
      <nav className="m3d-nav" aria-label="Magic3D">
        {START.navigare.map((item) => (
          <a
            key={item.href}
            href={item.href === "ghid" ? ghid(limba) : item.href}
            {...("extern" in item && item.extern ? { target: "_blank", rel: "noopener" } : {})}
          >
            {tx(item.text, limba)}
          </a>
        ))}
      </nav>
      <div className="m3d-header-actiuni">
        <label className="m3d-cautare">
          <Search size={16} strokeWidth={2.2} aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => onQueryChange(event.currentTarget.value)} placeholder={searchPlaceholder} aria-label={searchLabel} />
        </label>
        <ThemeSwitch />
        <LanguageSwitch />
        <a className="m3d-buton m3d-buton-contur" href="#proiecte">{tst("proiectele")}</a>
        <button className="m3d-buton m3d-buton-plin" type="button" onClick={onOpenEditor}>{tst("deschideEditorul")}</button>
      </div>
    </header>
  );
}

/** Hero: titlul, cele doua butoane, continuarea ultimei planse, importul si cifrele atelierului. */
export function StartHero({ onCreate, onContinue, onImport, ultima }: {
  onCreate: () => void;
  onContinue: () => void;
  onImport: () => void;
  ultima: { nume: string; cand: string; poza: string | null } | null;
}) {
  const limba = useLanguage();
  return (
    <section className="m3d-hero">
      <div className="m3d-hero-text">
        <span className="m3d-supratitlu">{tst("supraTitlu")}</span>
        <h1>
          {tst("titlu1")}
          <br />
          <span className="m3d-verde">{tst("titluVerde")}</span>
          {tst("titlu2")}
        </h1>
        <p className="m3d-intro">{tst("intro")}</p>
        <div className="m3d-hero-butoane">
          <button className="m3d-buton m3d-buton-plin m3d-buton-mare" type="button" onClick={onCreate}>{t("dashboard.createDesign")}</button>
          <a className="m3d-buton m3d-buton-moale m3d-buton-mare" href="#generatoare">{tst("dinGenerator")}</a>
        </div>
        <div className="m3d-hero-carduri">
          {ultima ? (
            <button className="m3d-card-actiune" type="button" onClick={onContinue}>
              <span className="m3d-card-actiune-poza">
                {ultima.poza ? <img src={ultima.poza} alt="" /> : <FolderOpen size={20} aria-hidden="true" />}
              </span>
              <span className="m3d-card-actiune-text">
                <strong>{tst("continua")}</strong>
                <span>{ultima.nume} · {ultima.cand}</span>
              </span>
            </button>
          ) : null}
          <button className="m3d-card-actiune m3d-card-import" type="button" onClick={onImport}>
            <span className="m3d-card-actiune-icon"><Upload size={20} aria-hidden="true" /></span>
            <span className="m3d-card-actiune-text">
              <strong>{t("dashboard.importGeometry")}</strong>
              <span>{tst("formate")}</span>
            </span>
          </button>
        </div>
        <div className="m3d-cifre">
          {START.cifre.map((cifra) => (
            <span key={tx(cifra.text, limba)}><strong>{tx(cifra.valoare, limba)}</strong> {tx(cifra.text, limba)}</span>
          ))}
        </div>
      </div>
      <div className="m3d-hero-ilustratie">
        <img className="m3d-hero-poza" src={START.pozaHero} alt={tst("pozaHeroAlt")} width={1536} height={1024} fetchPriority="high" />
        <div className="m3d-ilustratie-whatsapp" aria-hidden="true">
          <span>{tst("ilustratieSus")}</span>
          <strong>{tst("ilustratieTitlu")}</strong>
          <span>{tst("ilustratieJos")}</span>
        </div>
      </div>
    </section>
  );
}

const pozaForma = (forma: string) => libraryShapeAssets.find((asset) => asset.id === forma)?.src;

/** Grila de generatoare: fiecare card deschide un design nou cu forma lui deja pe plansa. */
export function StartGeneratoare({ onCreate }: { onCreate: () => void }) {
  const limba = useLanguage();
  const deschide = (forma: string) => {
    noteazaFormaInitiala(forma);
    onCreate();
  };
  return (
    <section className="m3d-sectiune" id="generatoare">
      <div className="m3d-sectiune-cap">
        <div>
          <h2>{tst("genTitlu")}</h2>
          <p>{tst("genText")}</p>
        </div>
        <button
          className="m3d-link-sageata"
          type="button"
          onClick={() => {
            // Generatoarele Magic3D (litere, nume, brelocuri...) stau in editor: designul nou se deschide cu panoul lor.
            onCreate();
            window.setTimeout(() => window.dispatchEvent(new Event(DESCHIDE_GENERATOARE)), 1200);
          }}
        >
          <Sparkles size={16} aria-hidden="true" /> {tst("genMagic3d")}
        </button>
      </div>
      <div className="m3d-grila-generatoare">
        {START.generatoare.map((generator, index) => (
          <button key={generator.forma} type="button" className="m3d-card-generator" data-testid={`start-generator-${generator.forma}`} onClick={() => deschide(generator.forma)}>
            <span className={`m3d-card-generator-icon${index % 2 ? " alt" : ""}`}>
              {/* The picture the editor's shape library shows, rendered from the shape's real geometry; the glyph if there is none. */}
              {pozaForma(generator.forma) ? <img src={`/${pozaForma(generator.forma)}`} alt="" loading="lazy" /> : generator.icon}
            </span>
            <strong>{tx(generator.titlu, limba)}</strong>
            <span>{tx(generator.text, limba)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Banda verde: cei trei pasi pana la piesa printata, cererea de oferta si reducerea pentru studenti. */
export function StartPasi() {
  const limba = useLanguage();
  const whatsapp = `https://wa.me/${START.whatsapp}?text=${encodeURIComponent(tx(START.mesajWhatsApp, limba))}`;
  const pasi = [
    [tst("pas1"), tst("pas1Text")],
    [tst("pas2"), tst("pas2Text")],
    [tst("pas3"), tst("pas3Text")],
  ];
  return (
    <section className="m3d-sectiune m3d-sectiune-banda">
      <div className="m3d-banda">
        <div className="m3d-banda-cap">
          <div>
            <span className="m3d-banda-sus">{tst("pasiSus")}</span>
            <h2>{tst("pasiTitlu")}</h2>
          </div>
          <a className="m3d-buton m3d-buton-alb" href={whatsapp} target="_blank" rel="noopener">{tst("cereOferta")}</a>
        </div>
        <ol className="m3d-pasi">
          {pasi.map(([titlu, text], index) => (
            <li key={titlu}>
              <span className="m3d-pas-numar">{index + 1}</span>
              <strong>{titlu}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <div className="m3d-studenti">
          <span className="m3d-studenti-eticheta">{tst("studenti")}</span>
          <span>{tst("studentiText")}</span>
        </div>
      </div>
    </section>
  );
}

/** Lucrari reale din atelier; nu apare deloc pana nu exista macar o poza in config. */
export function StartLucrari() {
  const limba = useLanguage();
  const cuPoza = START.lucrari.filter((lucrare) => lucrare.poza);
  if (cuPoza.length === 0) return null;
  return (
    <section className="m3d-sectiune">
      <div className="m3d-sectiune-cap">
        <div>
          <h2>{tst("lucrariTitlu")}</h2>
          <p>{tst("lucrariText")}</p>
        </div>
      </div>
      <div className="m3d-grila-lucrari">
        {cuPoza.map((lucrare) => (
          <figure key={lucrare.poza} className="m3d-card-lucrare">
            <img src={lucrare.poza} alt={tx(lucrare.titlu, limba)} loading="lazy" />
            <figcaption>
              <span>{tx(lucrare.eticheta, limba)}</span>
              <strong>{tx(lucrare.titlu, limba)}</strong>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Cele doua carduri: scoli (Layerkids Academy) si firme (Praktik3D). */
export function StartCarduri() {
  return (
    <section className="m3d-sectiune m3d-grila-doua">
      <article className="m3d-card-info">
        <span className="m3d-supratitlu">{tst("scoliSus")}</span>
        <strong>{tst("scoliTitlu")}</strong>
        <p>{tst("scoliText")}</p>
        <a href={START.scoli.href} target="_blank" rel="noopener">{tst("scoliLink")}</a>
      </article>
      <article className="m3d-card-info">
        <span className="m3d-supratitlu">{tst("firmeSus")}</span>
        <strong>{tst("firmeTitlu")}</strong>
        <p>{tst("firmeText")}</p>
        <a href={START.firme.href} target="_blank" rel="noopener">{tst("firmeLink")} </a>
      </article>
    </section>
  );
}

/** Stratul care apare cand tragi fisiere peste pagina. */
export function StartStratImport() {
  return (
    <div className="m3d-strat-import" aria-hidden="true">
      <div><Upload size={32} /> {tst("elibereaza")}</div>
    </div>
  );
}

