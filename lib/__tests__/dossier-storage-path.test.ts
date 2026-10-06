/** @jest-environment node */

import { extractDossierStoragePath } from '@/lib/dossier-storage-path'

describe('extractDossierStoragePath', () => {
  test('extrait le chemin d\'une URL publique historique', () => {
    expect(
      extractDossierStoragePath(
        'https://api.maydai.io/storage/v1/object/public/dossiers/comp/u1/doc/a%20b.pdf'
      )
    ).toBe('comp/u1/doc/a b.pdf')
  })

  test('extrait le chemin d\'une URL signée sans garder le jeton', () => {
    expect(
      extractDossierStoragePath(
        'https://api.maydai.io/storage/v1/object/sign/dossiers/comp/u1/doc/a.pdf?token=secret'
      )
    ).toBe('comp/u1/doc/a.pdf')
  })

  test('accepte un chemin relatif déjà stocké', () => {
    expect(extractDossierStoragePath('comp/u1/doc/a.pdf')).toBe('comp/u1/doc/a.pdf')
  })

  test('refuse un chemin hors bucket, vide ou avec remontée de dossier', () => {
    expect(extractDossierStoragePath(null)).toBeNull()
    expect(extractDossierStoragePath('')).toBeNull()
    expect(extractDossierStoragePath('a.pdf')).toBeNull()
    expect(extractDossierStoragePath('../secret.pdf')).toBeNull()
    expect(
      extractDossierStoragePath('https://api.maydai.io/storage/v1/object/public/other/comp/a.pdf')
    ).toBeNull()
    expect(
      extractDossierStoragePath('https://evil.example/storage/v1/object/public/dossiers/../a.pdf')
    ).toBeNull()
  })
})
