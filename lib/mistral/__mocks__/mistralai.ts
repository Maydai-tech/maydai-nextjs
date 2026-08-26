/** Stub Jest du SDK ESM `@mistralai/mistralai` (non transformé par next/jest). */

export const Mistral = jest.fn().mockImplementation(() => ({
  embeddings: {
    create: jest.fn(),
  },
  ocr: {
    process: jest.fn(),
  },
  agents: {
    complete: jest.fn(),
  },
}))
