import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./dashboard.css";
import "./historyView.css";
import "./notes.css";
import "./tape.css";
import "./myShapes.css";
import "./attachments.css";
import "./viewCube.css";
import "./secondView.css";
import "./shortcuts.css";
import "./sketchImage.css";
import "./sketchLock.css";
import "./dashboardSelect.css";
import "@/magic3d/oferta/oferta.css";
import "@/magic3d/logo/logo.css";
import "@/magic3d/termo/termo.css";
import "@/magic3d/generatoare/generatoare.css";
import "@/magic3d/sustine/sustine.css";
import "@/magic3d/start/start.css";
import { DiagnoseStrip } from "@/components/DiagnoseStrip";
import { HtmlSettingsRestore } from "@/components/HtmlSettingsRestore";
import { NewVersionNotice } from "@/components/NewVersionNotice";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { DOM_MUTATION_GUARD_SCRIPT } from "@/lib/domMutationGuard";
import { LANGUAGE_BOOT_SCRIPT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import { SHAPE_COLORS_BOOT_SCRIPT } from "@/lib/shapeColors";
import { SIMPLE_MODE_BOOT_SCRIPT } from "@/lib/simpleMode";
import { TOOLBAR_SIZE_BOOT_SCRIPT } from "@/lib/toolbarSize";
import { VIEW_CUBE_POSITION_BOOT_SCRIPT } from "@/lib/viewCubePosition";

const NAME = "Magic3D";
const TITLE = "Magic3D - CAD 3D gratuit pentru printare 3D, direct în browser";
const DESCRIPTION = "CAD 3D gratuit în browser, fără cont, ușor pentru cine vine din Tinkercad: rotunjiri, teșituri, corpuri golite și filete. Export în STL, 3MF și STEP.";

// Tells search engines what Magic3D is: a free web application, not an
// article about one.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: NAME,
  url: "https://magic3d.ro/",
  description: DESCRIPTION,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any (web browser)",
  inLanguage: [...LANGUAGES],
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  image: "https://magic3d.ro/assets/magic3d/magic3d-social.png",
  sameAs: ["https://github.com/firg3d/magic3d"],
};
const SOCIAL_CARD = "/assets/magic3d/magic3d-social.png";

// Chrome and Edge announce "this can be installed" once, often before React is
// running. The event is kept for the start page's install button
// (InstallAppHint); preventDefault only stops the small bar on phones.
const INSTALL_PROMPT_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__layerlingInstallPrompt=e;window.dispatchEvent(new Event("layerling-install-prompt"))});window.addEventListener("appinstalled",function(){window.__layerlingInstallPrompt=null;window.dispatchEvent(new Event("layerling-install-prompt"))});`;

export const metadata: Metadata = {
  // Damit die Bilder fuer Linkvorschauen als volle Adresse im Kopf stehen -
  // relative Angaben liest kein Forum und kein Messenger aus.
  metadataBase: new URL("https://magic3d.ro"),
  alternates: { canonical: "/" },
  title: TITLE,
  description: DESCRIPTION,
  applicationName: NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    // Das SVG ist das eigentliche Symbol; die .ico steht daneben fuer alles,
    // was stur /favicon.ico abholt, statt in den Kopf zu sehen.
    icon: [
      { url: "/assets/magic3d/magic3d-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    // iOS nimmt hier ausschliesslich PNG. Stand da ein SVG, legte
    // "Zum Home-Bildschirm" einen Schnappschuss der Seite ab statt des Symbols.
    apple: { url: "/assets/magic3d/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    siteName: NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "ro_RO",
    images: [{ url: SOCIAL_CARD, width: 1280, height: 640, type: "image/png", alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SOCIAL_CARD],
  },
};

export const viewport: Viewport = {
  // Faerbt die Leiste des Browsers und, wenn layerling als App laeuft, deren
  // Titelzeile. Die Werte sind die der Werkzeugleiste, hell wie dunkel.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#1c251f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Translate tools add classes such as translated-ltr to <html>; that must not end in a hydration error (#191).
    // The browser may translate into a language layerling does not speak (#681); the page's language is set first
    // thing, so it does not translate a language into itself, and names people gave stay out of it (translate="no").
    <html lang="ro" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_BOOT_SCRIPT }} />
        {/* Before any of React's scripts: a page rearranged by Translate must not crash it (#186). */}
        <script dangerouslySetInnerHTML={{ __html: DOM_MUTATION_GUARD_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: TOOLBAR_SIZE_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SIMPLE_MODE_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SHAPE_COLORS_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: VIEW_CUBE_POSITION_BOOT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        <HtmlSettingsRestore />
        {children}
        <ServiceWorkerRegistration />
        <DiagnoseStrip />
        <NewVersionNotice />
      </body>
    </html>
  );
}
