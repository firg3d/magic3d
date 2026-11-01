/*
 * Pagina de start Magic3D: tot ce e de continut sta aici, nu in componente - verdele principal,
 * navigarea, cifrele atelierului, generatoarele, lucrarile, linkurile. Textele au romana si engleza.
 * Verdele e un token CSS (--m3d-verde) pus doar pe pagina de start: editorul nu se schimba.
 */

export type Text = { ro: string; en: string };

export const START = {
  /** Verdele principal al paginii de start; il vom potrivi cu verdele Praktik3D. */
  verde: "#1f8a5b",
  verdeInchis: "#15734c",

  navigare: [
    { text: { ro: "Generatoare", en: "Generators" }, href: "#generatoare" },
    { text: { ro: "Printare", en: "Printing" }, href: "https://praktik3d.ro", extern: true },
    { text: { ro: "Școli", en: "Schools" }, href: "https://lka.ro", extern: true },
    { text: { ro: "Ghid", en: "Guide" }, href: "ghid" as const },
  ],

  /** Poza din dreapta hero-ului: o piesa reala, printata in atelier. */
  pozaHero: "/magic3d/start/suport-telefon.webp",

  /** Cifrele atelierului, sub butoanele din hero. */
  cifre: [
    { valoare: "500+", text: { ro: "lucrări printate", en: "parts printed" } },
    { valoare: "★ 5,0", text: { ro: "pe Google", en: "on Google" } },
    { valoare: { ro: "din 2016", en: "since 2016" }, text: { ro: "în printare 3D", en: "in 3D printing" } },
  ],

  /**
   * Cardurile de generatoare: fiecare deschide editorul cu o forma din biblioteca deja pe plansa
   * (`forma` = id-ul din lib/shapeCatalog.ts). Ordinea de aici e ordinea de pe pagina.
   */
  generatoare: [
    { forma: "nameTag", icon: "Aa", titlu: { ro: "Breloc cu nume", en: "Name keyring" }, text: { ro: "Text, font, ramă și gaură de inel.", en: "Text, font, frame and key ring hole." } },
    { forma: "box", icon: "▢", titlu: { ro: "Cutie cu capac", en: "Box with lid" }, text: { ro: "Cutia pe placă; capacul îl faci din Modificare → Capac.", en: "The box on the plate; make its lid with Modify → Lid." } },
    { forma: "gear", icon: "⚙", titlu: { ro: "Roată dințată", en: "Gear" }, text: { ro: "Număr de dinți, modul, ax.", en: "Number of teeth, module, shaft." } },
    { forma: "qrCode", icon: "QR", titlu: { ro: "Cod QR", en: "QR code" }, text: { ro: "Din link sau text, în relief.", en: "From a link or text, raised." } },
    { forma: "vase", icon: "◡", titlu: { ro: "Vază și ghiveci", en: "Vase and planter" }, text: { ro: "Formă, răsucire, găuri de drenaj.", en: "Shape, twist, drainage holes." } },
    { forma: "gridfinity", icon: "#", titlu: { ro: "Gridfinity", en: "Gridfinity" }, text: { ro: "Cutii și plăci de bază pe module.", en: "Bins and baseplates on a grid." } },
    { forma: "thread", icon: "⌇", titlu: { ro: "Filete și șuruburi", en: "Threads and screws" }, text: { ro: "Metric, cu piuliță potrivită.", en: "Metric, with a matching nut." } },
    { forma: "hinge", icon: "⟂", titlu: { ro: "Balama print-in-place", en: "Print-in-place hinge" }, text: { ro: "Se printează gata asamblată.", en: "Prints already assembled." } },
  ],

  /** Generatoarele "Personalizate" (produse cu nume, gata de dat cadou): fiecare card deschide editorul pe generatorul lui. */
  personalizate: {
    titlu: { ro: "Personalizate", en: "Personalised" },
    carduri: [
      { generator: "stampila", icon: "✒", titlu: { ro: "Ștampilă personalizată", en: "Custom stamp" }, text: { ro: "Text sau logo, pentru cerneală sau pentru lut și fondant; mâner la alegere.", en: "Text or a logo, for ink or for clay and fondant; pick the handle." } },
      { generator: "presa", icon: "◎", titlu: { ro: "Presă pentru hârtie", en: "Paper embosser" }, text: { ro: "Emblemă în relief pe hârtie și carton: clește cu balamaua printată gata montată.", en: "A raised emblem on paper and card: a clamp whose hinge prints assembled." } },
      { generator: "ornament", icon: "❄", titlu: { ro: "Ornament de Crăciun", en: "Christmas ornament" }, text: { ro: "Disc cu nume sau glob 3D din două jumătăți; pachet pentru toată familia.", en: "A named disc or a 3D bauble in two halves; a pack for the whole family." } },
    ],
  },

  /** Generatoarele "Matrite" (pentru turnat si presat in atelier), la fel ca "Personalizate". */
  matrite: {
    titlu: { ro: "Matrițe", en: "Molds" },
    carduri: [
      { generator: "tava", icon: "▦", titlu: { ro: "Matriță tavă", en: "Tray mold" }, text: { ro: "Forme în grilă pentru săpun, ceară, ipsos sau rășină; sau master pentru silicon, cu volumul calculat.", en: "Shapes in a grid for soap, wax, plaster or resin; or a silicone master with the volume worked out." } },
      { generator: "silicon", icon: "◍", titlu: { ro: "Matriță de silicon din model 3D", en: "Silicone mold from a 3D model" }, text: { ro: "Încarci modelul: primești cutia de turnare, placa de separație cu chei, canalul și volumul de silicon.", en: "Upload the model: get the mold box, the keyed parting plate, the pour channel and the silicone volume." } },
      { generator: "presalut", icon: "◧", titlu: { ro: "Presă pentru lut și săpun", en: "Clay and soap press" }, text: { ro: "Două jumătăți cu canal de surplus și știfturi, sau o ștampilă mare de săpun.", en: "Two halves with an overflow channel and pins, or a large soap stamp." } },
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
