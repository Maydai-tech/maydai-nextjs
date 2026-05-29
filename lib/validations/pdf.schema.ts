import { z } from 'zod'

/**
 * Métadonnées normalisées d'une entrée `usecase_history` pour le rapport PDF.
 */
export const ActivityHistoryMetadataSchema = z.object({
  label: z.string(),
  score_impact: z.number(),
  user_name: z.string(),
})

/**
 * Entrée d'historique d'activité (`usecase_history`) incluse dans le payload PDF.
 */
export const ActivityHistoryItemSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  created_at: z.union([z.string(), z.date()]),
  metadata: ActivityHistoryMetadataSchema,
})

/** Document de dossier (`dossier_documents`) résumé pour le rapport PDF. */
export const PdfDocumentItemSchema = z.object({
  status: z.string(),
  doc_type: z.string(),
})

/**
 * Schéma principal du cas d'usage pour la génération du rapport PDF AI Act.
 */
export const PdfUseCaseSchema = z.object({
  score_final: z.number().nullable(),
  score_model: z.number().nullable(),
  history: z.array(ActivityHistoryItemSchema),
  documents: z.array(PdfDocumentItemSchema),
})

export type ActivityHistoryMetadata = z.infer<typeof ActivityHistoryMetadataSchema>
export type ActivityHistoryItem = z.infer<typeof ActivityHistoryItemSchema>
export type PdfDocumentItem = z.infer<typeof PdfDocumentItemSchema>
export type PdfUseCase = z.infer<typeof PdfUseCaseSchema>
