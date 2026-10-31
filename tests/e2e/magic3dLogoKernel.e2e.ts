import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// Manifold isi incarca fisierele relativ la pagina; in node ele sunt in folderul public.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import { getManifoldRuntime } from "@/lib/editorMeshCore";
import { analyzeTriangleSoup, extrudedRingsWithKernel } from "@/lib/svgImport";

/*
 * "Din poză sau logo": straturile unui logo urmarit sunt ridicate de manifold, pe calea importului
 * SVG (extrudedRingsWithKernel). Un contur din poza are colturi care doar se ating, pe care nucleul
 * CAD le refuza; aici trebuie sa iasa un corp etans, la inaltimea ceruta.
 */

const patrat = (x: number, y: number, latura: number): Array<[number, number]> => [[x, y], [x + latura, y], [x + latura, y + latura], [x, y + latura]];

describe("contur -> corp prin manifold", () => {
  it("doua patrate care se ating intr-un colt ies un corp etans, la inaltimea ceruta", async () => {
    const runtime = await getManifoldRuntime();
    const positions = extrudedRingsWithKernel(runtime, [patrat(0, 0, 10), patrat(10, 10, 10)], 1.6);
    expect(positions).not.toBeNull();
    const analiza = analyzeTriangleSoup(positions!);
    expect(analiza.boundaryEdges).toBe(0);
    expect(analiza.nonManifoldEdges).toBe(0);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 1; i < positions!.length; i += 3) {
      minY = Math.min(minY, positions![i]);
      maxY = Math.max(maxY, positions![i]);
    }
    expect(minY).toBeCloseTo(0, 6);
    expect(maxY).toBeCloseTo(1.6, 6);
  });

  it("un inel cu gol (litera \"o\") ramane cu gol", async () => {
    const runtime = await getManifoldRuntime();
    const cerc = (r: number, invers = false) => {
      const puncte = Array.from({ length: 48 }, (_, i) => [r * Math.cos((2 * Math.PI * i) / 48), r * Math.sin((2 * Math.PI * i) / 48)] as [number, number]);
      return invers ? puncte.reverse() : puncte;
    };
    const positions = extrudedRingsWithKernel(runtime, [cerc(10), cerc(5, true)], 2);
    expect(positions).not.toBeNull();
    // Nimic in mijloc: niciun varf mai aproape de centru decat golul.
    let minR = Infinity;
    for (let i = 0; i < positions!.length; i += 3) minR = Math.min(minR, Math.hypot(positions![i], positions![i + 2]));
    expect(minR).toBeGreaterThan(4.5);
  });

  it("un contur gol nu da nimic", async () => {
    expect(extrudedRingsWithKernel(await getManifoldRuntime(), [], 2)).toBeNull();
  });
});
