/**
 * Clipboard Translator - instantly translate copied text.
 *
 * Design goals:
 * - Maintain a history of clipboard translation events.
 * - Each history record has the original text + translated text.
 * - Lightweight and fast to query, with optional grouping sessions later.
 */

import { defineTable, column, NOW } from "astro:db";

export const ClipboardTranslationHistory = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    sourceLanguage: column.text({ optional: true }),
    targetLanguage: column.text({ optional: true }),
    originalText: column.text(),
    translatedText: column.text(),
    contextHint: column.text({ optional: true }),      // "system", "browser", "app name" if we capture it
    isFavorite: column.boolean({ default: false }),    // user can star important translations
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  ClipboardTranslationHistory,
} as const;
