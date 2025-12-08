import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { ClipboardTranslationHistory, and, db, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createTranslation: defineAction({
    input: z.object({
      sourceLanguage: z.string().optional(),
      targetLanguage: z.string().optional(),
      originalText: z.string().min(1),
      translatedText: z.string().min(1),
      contextHint: z.string().optional(),
      isFavorite: z.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [translation] = await db
        .insert(ClipboardTranslationHistory)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          originalText: input.originalText,
          translatedText: input.translatedText,
          contextHint: input.contextHint,
          isFavorite: input.isFavorite ?? false,
          createdAt: new Date(),
        })
        .returning();

      return { success: true, data: { translation } };
    },
  }),

  updateTranslation: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        sourceLanguage: z.string().optional(),
        targetLanguage: z.string().optional(),
        originalText: z.string().optional(),
        translatedText: z.string().optional(),
        contextHint: z.string().optional(),
        isFavorite: z.boolean().optional(),
      })
      .refine(
        (input) =>
          input.sourceLanguage !== undefined ||
          input.targetLanguage !== undefined ||
          input.originalText !== undefined ||
          input.translatedText !== undefined ||
          input.contextHint !== undefined ||
          input.isFavorite !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(ClipboardTranslationHistory)
        .where(and(eq(ClipboardTranslationHistory.id, input.id), eq(ClipboardTranslationHistory.userId, user.id)));

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Translation not found.",
        });
      }

      const [translation] = await db
        .update(ClipboardTranslationHistory)
        .set({
          ...(input.sourceLanguage !== undefined ? { sourceLanguage: input.sourceLanguage } : {}),
          ...(input.targetLanguage !== undefined ? { targetLanguage: input.targetLanguage } : {}),
          ...(input.originalText !== undefined ? { originalText: input.originalText } : {}),
          ...(input.translatedText !== undefined ? { translatedText: input.translatedText } : {}),
          ...(input.contextHint !== undefined ? { contextHint: input.contextHint } : {}),
          ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
        })
        .where(eq(ClipboardTranslationHistory.id, input.id))
        .returning();

      return { success: true, data: { translation } };
    },
  }),

  deleteTranslation: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const result = await db
        .delete(ClipboardTranslationHistory)
        .where(
          and(
            eq(ClipboardTranslationHistory.id, input.id),
            eq(ClipboardTranslationHistory.userId, user.id)
          )
        );

      if (result.rowsAffected === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Translation not found.",
        });
      }

      return { success: true };
    },
  }),

  listTranslations: defineAction({
    input: z.object({
      favoritesOnly: z.boolean().default(false),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const filters = [eq(ClipboardTranslationHistory.userId, user.id)];
      if (input.favoritesOnly) {
        filters.push(eq(ClipboardTranslationHistory.isFavorite, true));
      }

      const translations = await db
        .select()
        .from(ClipboardTranslationHistory)
        .where(and(...filters));

      return { success: true, data: { items: translations, total: translations.length } };
    },
  }),
};
