import { en, type Messages } from "./locales/en";
import { tr } from "./locales/tr";

export { en, tr };
export type { Messages };

/** Birleşik sözlük — anahtarlar `personnel.heading` gibi noktalı yol ile aynı kalır. */
export const messages = { en, tr } as const;

export type Locale = keyof typeof messages;
