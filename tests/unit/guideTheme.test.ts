import { describe, expect, it } from "vitest";
import { graphiteGrey } from "../../scripts/generate-graphite-theme.mjs";
import { STYLE, THEME_SCRIPT } from "../../scripts/build-guide.mjs";

/*
 * The guide follows the program's colour theme, Graphite too (#278): the dark theme with the warm
 * browns turned grey. Its greys must be the ones the program's own Graphite works out. Reads the
 * guide's stylesheet and script as the builder holds them, so it needs no built guide.
 */
function tokens(block: string) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((match) => [match[1], match[2].toLowerCase()]));
}

const dark = tokens(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(STYLE)?.[1] ?? "");
const graphite = tokens(/:root\[data-theme="dark"\]\[data-palette="graphite"\]\s*\{([^}]*)\}/.exec(STYLE)?.[1] ?? "");

describe("the guide in Graphite", () => {
  it("sets the palette when Graphite is the stored theme", () => {
    expect(THEME_SCRIPT).toContain('t==="graphite"');
    expect(THEME_SCRIPT).toContain('dataset.palette="graphite"');
  });

  it("has a grey for every warm colour of the dark theme, and only for those", () => {
    // Magic3D's dark theme is green; the program's Graphite turns only warm hues grey, so it keeps them all.
    const warm = Object.entries(dark).filter(([, value]) => {
      const number = parseInt(value.slice(1), 16);
      return graphiteGrey((number >> 16) & 255, (number >> 8) & 255, number & 255) !== null;
    }).map(([name]) => name);
    expect(Object.keys(graphite).sort()).toEqual(warm.sort());
  });

  it("uses the greys the program's Graphite works out", () => {
    for (const [name, value] of Object.entries(graphite)) {
      const source = dark[name];
      expect(source, name).toBeTruthy();
      const number = parseInt(source.slice(1), 16);
      const grey = graphiteGrey((number >> 16) & 255, (number >> 8) & 255, number & 255) as number[];
      expect(value, name).toBe(`#${grey.map((part) => part.toString(16).padStart(2, "0")).join("")}`);
    }
  });
});
