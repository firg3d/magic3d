/*
 * Pagina de start Magic3D: tot ce e de continut sta aici, nu in componente - verdele principal,
 * navigarea, cifrele atelierului, generatoarele, lucrarile, linkurile. Textele au romana si engleza.
 * Culorile si fonturile sunt tokenuri in tema.css, puse doar pe pagina de start: editorul nu se schimba.
 */

export type Text = { ro: string; en: string };

export const START = {
  navigare: [
    { text: { ro: "Generatoare", en: "Generators" }, href: "#generatoare" },
    { text: { ro: "Printare", en: "Printing" }, href: "https://praktik3d.ro", extern: true },
    { text: { ro: "Școli", en: "Schools" }, href: "https://lka.ro", extern: true },
    { text: { ro: "Ghid", en: "Guide" }, href: "ghid" as const },
  ],

  /** Cifrele atelierului, sub butoanele din hero: eticheta mica (mono) si valoarea. */
  cifre: [
    { eticheta: { ro: "Lucrări livrate", en: "Parts delivered" }, valoare: "500+" },
    { eticheta: { ro: "Google", en: "Google" }, valoare: "5,0 ★" },
    { eticheta: { ro: "Printăm din", en: "Printing since" }, valoare: "2016" },
  ],

  /** Banda care deruleaza sub hero: comenzi G-code, intre ele numele generatoarelor (din catalog). */
  gcode: ["G28 ; acasă", "M104 S215", "M140 S60", "G1 Z0.20 F600", "G1 X104.2 Y88.0 E2.31", "G1 Z12.40 F600", "G1 X96.0 Y120.5 E4.02", "G1 X60.1 Y60.1 E0.82"],

  /**
   * Cardurile de generatoare: fiecare deschide editorul cu o forma din biblioteca deja pe plansa
   * (`forma` = id-ul din lib/shapeCatalog.ts). Ordinea de aici e ordinea de pe pagina; `param` e
   * parametrul tehnic din dreapta randului (mono, ascuns pe telefon).
   */
  generatoare: [
    { forma: "nameTag", icon: "Aa", titlu: { ro: "Breloc cu nume", en: "Name keyring" }, text: { ro: "Text, font, ramă și gaură de inel.", en: "Text, font, frame and key ring hole." }, param: "TEXT · 60 MM" },
    { forma: "box", icon: "▢", titlu: { ro: "Cutie cu capac", en: "Box with lid" }, text: { ro: "Cutia pe placă; capacul îl faci din Modificare → Capac.", en: "The box on the plate; make its lid with Modify → Lid." }, param: "L×l×H · JOC 0,2" },
    { forma: "gear", icon: "⚙", titlu: { ro: "Roată dințată", en: "Gear" }, text: { ro: "Număr de dinți, modul, ax.", en: "Number of teeth, module, shaft." }, param: "Z 24 · M 1,5" },
    { forma: "qrCode", icon: "QR", titlu: { ro: "Cod QR", en: "QR code" }, text: { ro: "Din link sau text, în relief.", en: "From a link or text, raised." }, param: "40 × 40 MM" },
    { forma: "vase", icon: "◡", titlu: { ro: "Vază și ghiveci", en: "Vase and planter" }, text: { ro: "Formă, răsucire, găuri de drenaj.", en: "Shape, twist, drainage holes." }, param: "VASE MODE" },
    { forma: "gridfinity", icon: "#", titlu: { ro: "Gridfinity", en: "Gridfinity" }, text: { ro: "Cutii și plăci de bază pe module.", en: "Bins and baseplates on a grid." }, param: "42 MM GRID" },
    { forma: "thread", icon: "⌇", titlu: { ro: "Filete și șuruburi", en: "Threads and screws" }, text: { ro: "Metric, cu piuliță potrivită.", en: "Metric, with a matching nut." }, param: "M3 – M24" },
    { forma: "hinge", icon: "⟂", titlu: { ro: "Balama print-in-place", en: "Print-in-place hinge" }, text: { ro: "Se printează gata asamblată.", en: "Prints already assembled." }, param: "JOC 0,4 MM" },
  ],

  /** Generatoarele "Personalizate" (produse cu nume, gata de dat cadou): fiecare card deschide editorul pe generatorul lui. */
  personalizate: {
    titlu: { ro: "Personalizate", en: "Personalised" },
    carduri: [
      { generator: "stampila", icon: "✒", titlu: { ro: "Ștampilă personalizată", en: "Custom stamp" }, text: { ro: "Text sau logo, pentru cerneală sau pentru lut și fondant; mâner la alegere.", en: "Text or a logo, for ink or for clay and fondant; pick the handle." }, param: "TPU + PLA" },
      { generator: "presa", icon: "◎", titlu: { ro: "Presă pentru hârtie", en: "Paper embosser" }, text: { ro: "Emblemă în relief pe hârtie și carton: clește cu balamaua printată gata montată.", en: "A raised emblem on paper and card: a clamp whose hinge prints assembled." }, param: "Ø 20–40 MM" },
    ],
  },

  /**
   * Colectia "Craciun": in catalog tot anul; in sezon (apps/craciun/config.ts, SEZON_CRACIUN) are si
   * cardul ei mare pe pagina de start, deasupra noutatilor.
   */
  craciun: {
    titlu: { ro: "Crăciun", en: "Christmas" },
    carduri: [
      { generator: "glob-nume", icon: "✶", titlu: { ro: "Glob cu nume decupat", en: "Bauble with a cut-out name" }, text: { ro: "Numele traversează globul și se prinde de ramă; fulgi, steluțe sau brazi în jur; pachet pentru toată familia.", en: "The name crosses the bauble and holds on to the frame; snowflakes, stars or trees around it; a pack for the whole family." }, param: "Ø 60–120 MM" },
      { generator: "turta-dulce", icon: "♥", titlu: { ro: "Turtă dulce glazurată", en: "Iced gingerbread" }, text: { ro: "Om de turtă dulce, brad, glob, stea, ren și altele: glazura, numele și decorul se fac singure.", en: "Gingerbread man, tree, bauble, star, reindeer and more: the icing, the name and the decoration make themselves." }, param: "BAZĂ + GLAZURĂ" },
      { generator: "ornament", icon: "❄", titlu: { ro: "Ornament de Crăciun", en: "Christmas ornament" }, text: { ro: "Disc cu nume sau glob 3D din două jumătăți; pachet pentru toată familia.", en: "A named disc or a 3D bauble in two halves; a pack for the whole family." }, param: "Ø 50–100 MM" },
    ],
  },

  /** Generatoarele "Matrite" (pentru turnat si presat in atelier), la fel ca "Personalizate". */
  matrite: {
    titlu: { ro: "Matrițe", en: "Molds" },
    carduri: [
      { generator: "tava", icon: "▦", titlu: { ro: "Matriță tavă", en: "Tray mold" }, text: { ro: "Forme în grilă pentru săpun, ceară, ipsos sau rășină; sau master pentru silicon, cu volumul calculat.", en: "Shapes in a grid for soap, wax, plaster or resin; or a silicone master with the volume worked out." }, param: "DRAFT 4°" },
      { generator: "silicon", icon: "◍", titlu: { ro: "Matriță de silicon din model 3D", en: "Silicone mold from a 3D model" }, text: { ro: "Încarci modelul: primești cutia de turnare, placa de separație cu chei, canalul și volumul de silicon.", en: "Upload the model: get the mold box, the keyed parting plate, the pour channel and the silicone volume." }, param: "2 JUMĂTĂȚI · ML" },
      { generator: "presalut", icon: "◧", titlu: { ro: "Presă pentru lut și săpun", en: "Clay and soap press" }, text: { ro: "Două jumătăți cu canal de surplus și știfturi, sau o ștampilă mare de săpun.", en: "Two halves with an overflow channel and pins, or a large soap stamp." }, param: "3 ȘTIFTURI" },
    ],
  },

  /** Numarul WhatsApp al atelierului pentru "Cere ofertă" de pe pagina de start (acelasi ca in oferta/config.json). */
  whatsapp: "40744330466",
  mesajWhatsApp: { ro: "Bună ziua! Aș dori o ofertă de print 3D.", en: "Hello! I would like a 3D printing quote." },

  /**
   * Lucrari reale din atelier: o poza in public/magic3d/lucrari/ si doua randuri de text. Sectiunea
   * apare doar daca macar o lucrare are poza - nu aratam locuri goale si nici randari drept piese reale.
   */
  lucrari: [] as { poza: string; eticheta: Text; titlu: Text }[],

  scoli: { href: "https://lka.ro" },
  firme: { href: "https://praktik3d.ro" },
};

export const tx = (text: Text | string, limba: string) => (typeof text === "string" ? text : limba === "ro" ? text.ro : text.en);
