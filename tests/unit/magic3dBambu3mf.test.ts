import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { proiectBambu } from "@/magic3d/core/assets/bambu3mf";
import { slicerA1Mini } from "@/magic3d/core/assets/bambuPreseturi";

/** Un cub de 10 mm, triunghiuri neindexate, Z in sus. */
function cub(): Float32Array {
  const v = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10]];
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
  return new Float32Array(f.flatMap((t) => t.flatMap((i) => v[i])));
}

describe("3MF Bambu: proiect pe care Bambu Studio il citeste cu setarile lui", () => {
  const slicer = slicerA1Mini([{ material: "PLA", culoare: "#f4f4f1" }, { material: "PETG", culoare: "#2c7be5" }]);
  const fisiere = unzipSync(proiectBambu({
    titlu: "Proba",
    instructiuni: "Proba",
    pat: 180,
    placi: [{ nume: "Placa", obiecte: [{ nume: "Cub", positions: cub(), extruder: 2, setari: { wall_loops: "3" } }] }],
    slicer,
  }));

  it("se declara proiect Bambu Studio (altfel incarca doar geometria, fara setari pe obiect)", () => {
    const model = strFromU8(fisiere["3D/3dmodel.model"]);
    expect(model).toMatch(/<metadata name="Application">BambuStudio-\d{2}\.\d{2}\.\d{2}\.\d{2}<\/metadata>/);
    expect(model).toContain('<metadata name="BambuStudio:3mfVersion">1</metadata>');
  });

  it("project_settings numeste imprimanta, procesul si cate un preset de sistem pe slot", () => {
    const cfg = JSON.parse(strFromU8(fisiere["Metadata/project_settings.config"])) as Record<string, unknown>;
    expect(cfg.printer_settings_id).toBe("Bambu Lab A1 mini 0.4 nozzle");
    expect(cfg.filament_settings_id).toEqual(["Bambu PLA Basic @BBL A1M", "Bambu PETG HF @BBL A1M"]);
    expect(cfg.filament_colour).toEqual(["#F4F4F1", "#2C7BE5"]);
    expect(cfg.filament_type).toEqual(["PLA", "PETG"]);
    // Fara inherits_group, Bambu Studio face din fiecare slot un preset fara nume, cu valori implicite.
    expect(cfg.inherits_group).toEqual([cfg.print_settings_id, ...(cfg.filament_settings_id as string[]), cfg.printer_settings_id]);
    expect((cfg.different_settings_to_system as string[]).length).toBe(4);
  });
});
