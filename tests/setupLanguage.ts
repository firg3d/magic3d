import { setLanguage } from "@/lib/i18n";

/*
 * Magic3D opens in Romanian (DEFAULT_LANGUAGE = "ro"). The tests inherited from layerling read
 * the English sentences, so every test file starts in English; the tests about the default
 * language itself (i18n.test.ts, i18nLanguages.test.ts) look at DEFAULT_LANGUAGE and
 * detectLanguage, which this does not touch.
 */
setLanguage("en", false);
