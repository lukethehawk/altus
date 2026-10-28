export const languages = ["en", "it"] as const;
export type Language = (typeof languages)[number];
export const fallbackLanguage = "en";

/** Each language is shown in its own name, whatever the current language. */
export const languageNames: Record<Language, string> = {
  en: "English",
  it: "Italiano",
};

/** Settings saved by older builds may name a language that was removed. */
export function isSupportedLanguage(value: unknown): value is Language {
  return (languages as readonly unknown[]).includes(value);
}
