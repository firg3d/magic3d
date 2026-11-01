"use client";

import { ImageUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RASTER_TRACE_EMPTY, type RasterPixels } from "@/lib/rasterTrace";
import { codeazaContur, decodeazaContur } from "@/magic3d/core/geometry/conturImagine";
import { tg } from "@/magic3d/generatoare/texte";
import { pixeliDinSvg, traseaza } from "@/magic3d/logo/client";
import { LOGO } from "@/magic3d/logo/config";
import { OPTIUNI_IMPLICITE } from "@/magic3d/logo/trasare";
import { tt } from "@/magic3d/termo/texte";

/*
 * Campul "imagine" al unui generator: aceeasi conturare ca la "logo -> obiect" (worker-ul logo,
 * monocrom, cu "Inverseaza" si netezire), iar in parametri ajunge doar conturul codat. Imaginea
 * ramane in browser cat e deschis panoul; la redeschidere se vede conturul pastrat.
 */

const ACCEPTA = ".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp";

export function CampImagine({ eticheta, valoare, onChange, testid }: { eticheta: string; valoare: string; onChange: (v: string) => void; testid: string }) {
  const intrare = useRef<HTMLInputElement>(null);
  const [sursa, setSursa] = useState<{ fisier: Blob } | { pixeli: RasterPixels } | null>(null);
  const [detaliu, setDetaliu] = useState(3);
  const [inversare, setInversare] = useState(false);
  const [conturez, setConturez] = useState(false);
  const [eroare, setEroare] = useState("");
  const contur = useMemo(() => decodeazaContur(valoare), [valoare]);

  const alege = async (fisier: File) => {
    setEroare("");
    if (fisier.size > LOGO.maxMbFisier * 1024 * 1024) {
      setEroare(tg("imagineMare", { mb: LOGO.maxMbFisier }));
      return;
    }
    try {
      if (fisier.type === "image/svg+xml" || /\.svg$/i.test(fisier.name)) setSursa({ pixeli: await pixeliDinSvg(await fisier.text(), LOGO.maxLaturaPx) });
      else if (/^image\/(png|jpeg|webp)$/.test(fisier.type) || /\.(png|jpe?g|webp)$/i.test(fisier.name)) setSursa({ fisier });
      else throw new Error("tip");
    } catch {
      setEroare(tg("imagineNecunoscuta"));
    }
  };

  // Conturul se reface la fiecare schimbare (cu o mica pauza cand se trage cursorul de detaliu).
  useEffect(() => {
    if (!sursa) return;
    let anulat = false;
    setConturez(true);
    const pauza = window.setTimeout(() => {
      traseaza(sursa, { ...OPTIUNI_IMPLICITE, culori: 1, netezire: 5 - detaliu, inversare })
        .then((t) => {
          if (anulat || !t) return;
          setEroare("");
          onChange(codeazaContur(t.latime, t.inaltime, t.straturi[0].inele));
        })
        .catch((error: unknown) => {
          if (!anulat) setEroare(error instanceof Error && error.message === RASTER_TRACE_EMPTY ? tg("imagineGoala") : tg("imagineNecunoscuta"));
        })
        .finally(() => !anulat && setConturez(false));
    }, 200);
    return () => {
      anulat = true;
      window.clearTimeout(pauza);
    };
    // onChange e o functie noua la fiecare randare a panoului; conturul urmeaza doar imaginea si optiunile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sursa, detaliu, inversare]);

  return (
    <div className="gen-imagine" data-testid={testid}>
      <span>{eticheta}</span>
      <div className="gen-imagine-rand">
        <button type="button" className="gen-card" data-testid={`${testid}-alege`} onClick={() => intrare.current?.click()}>
          <ImageUp size={16} aria-hidden /> {contur ? tg("schimbaImagine") : tg("alegeImagine")}
        </button>
        {contur ? (
          <button type="button" className="gen-imagine-scoate" data-testid={`${testid}-scoate`} aria-label={tg("stergeImagine")} onClick={() => { setSursa(null); onChange(""); }}>
            <X size={15} aria-hidden />
          </button>
        ) : null}
      </div>
      <input
        ref={intrare}
        type="file"
        accept={ACCEPTA}
        hidden
        data-testid={`${testid}-fisier`}
        onChange={(event) => {
          const fisier = event.target.files?.[0];
          event.target.value = "";
          if (fisier) void alege(fisier);
        }}
      />
      {contur ? (
        <svg className="gen-imagine-contur" viewBox={`0 0 ${contur.latime} ${contur.inaltime}`} role="img" aria-label={eticheta}>
          <path fillRule="evenodd" d={contur.inele.map((inel) => `M${inel.map(([x, y]) => `${x} ${y}`).join("L")}Z`).join("")} />
        </svg>
      ) : null}
      {sursa ? (
        <div className="gen-imagine-optiuni">
          <label className="gen-numar"><span>{tg("detaliuContur")}</span>
            <input type="range" data-testid={`${testid}-detaliu`} min={1} max={5} step={1} value={detaliu} onChange={(e) => setDetaliu(Number(e.target.value))} />
          </label>
          <label className="gen-bifa"><input type="checkbox" data-testid={`${testid}-inverseaza`} checked={inversare} onChange={(e) => setInversare(e.target.checked)} /><span>{tg("inverseaza")}</span></label>
        </div>
      ) : null}
      {conturez ? <small className="gen-nota">{tg("conturez")}</small> : null}
      {eroare ? <small className="gen-eroare" role="alert">{eroare}</small> : null}
      <small className="gen-nota" data-testid={`${testid}-drepturi`}>{tt("drepturi")} {tg("imaginePastrata")}</small>
    </div>
  );
}
