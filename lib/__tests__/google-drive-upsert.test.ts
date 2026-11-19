/** @jest-environment node */

const mockList = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockGet = jest.fn()
const mockExport = jest.fn()
const mockDrive = jest.fn()
const mockSheets = jest.fn()

jest.mock('googleapis', () => {
  class MockJwt {
    email?: string
    key?: string
    scopes?: string[]

    constructor(options: { email?: string; key?: string; scopes?: string[] }) {
      this.email = options.email
      this.key = options.key
      this.scopes = options.scopes
    }
  }

  return {
    google: {
      auth: { JWT: MockJwt },
      drive: (...args: unknown[]) => mockDrive(...args),
      sheets: (...args: unknown[]) => mockSheets(...args),
    },
  }
})

import { google } from 'googleapis'
import {
  findFileIdInFolder,
  getDriveClient,
  getDriveFileText,
  getFileFromDrive,
  getSheetsClient,
  upsertTextFileInFolder,
} from '../google-drive'

describe('Google Drive upsert', () => {
  const previousEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  const previousKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY

  beforeEach(() => {
    mockList.mockReset()
    mockCreate.mockReset()
    mockUpdate.mockReset()
    mockGet.mockReset()
    mockExport.mockReset()
    mockDrive.mockReset()
    mockSheets.mockReset()
    mockDrive.mockReturnValue({
      files: {
        list: mockList,
        create: mockCreate,
        update: mockUpdate,
        get: mockGet,
        export: mockExport,
      },
    })
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com'
    process.env.GOOGLE_DRIVE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n'
  })

  afterEach(() => {
    if (previousEmail == null) delete process.env.GOOGLE_DRIVE_CLIENT_EMAIL
    else process.env.GOOGLE_DRIVE_CLIENT_EMAIL = previousEmail
    if (previousKey == null) delete process.env.GOOGLE_DRIVE_PRIVATE_KEY
    else process.env.GOOGLE_DRIVE_PRIVATE_KEY = previousKey
  })

  test('uses the Drive write scope for JWT and upserts', async () => {
    mockList.mockResolvedValue({ data: { files: [] } })
    mockCreate.mockResolvedValue({ data: { id: 'created-1' } })

    await upsertTextFileInFolder({
      folderId: 'folder-1',
      fileName: 'MaydAI_LLM_Control_Tower.csv',
      content: 'slug\n',
    })

    expect(mockDrive).toHaveBeenCalledWith({
      version: 'v3',
      auth: expect.objectContaining({
        scopes: ['https://www.googleapis.com/auth/drive'],
      }),
    })
    getDriveClient()
    expect(mockDrive).toHaveBeenLastCalledWith({
      version: 'v3',
      auth: expect.objectContaining({
        scopes: ['https://www.googleapis.com/auth/drive'],
      }),
    })
    expect(google.auth.JWT).toBeDefined()
  })

  test('uses the Sheets scope for the Sheets client', () => {
    mockSheets.mockReturnValue({ spreadsheets: {} })
    getSheetsClient()
    expect(mockSheets).toHaveBeenCalledWith({
      version: 'v4',
      auth: expect.objectContaining({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      }),
    })
  })

  test('creates the file when it does not exist', async () => {
    mockList.mockResolvedValue({ data: { files: [] } })
    mockCreate.mockResolvedValue({ data: { id: 'created-1' } })

    const result = await upsertTextFileInFolder({
      folderId: 'folder-1',
      fileName: 'MaydAI_LLM_Control_Tower.csv',
      content: 'slug\n',
    })

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          name: 'MaydAI_LLM_Control_Tower.csv',
          parents: ['folder-1'],
          mimeType: 'text/csv',
        },
        supportsAllDrives: true,
      }),
    )
    expect(result).toEqual({ id: 'created-1', updated: false })
  })

  test('updates media in place when the file already exists', async () => {
    mockList.mockResolvedValue({ data: { files: [{ id: 'existing-1' }] } })
    mockUpdate.mockResolvedValue({ data: { id: 'existing-1' } })

    const result = await upsertTextFileInFolder({
      folderId: 'folder-1',
      fileName: 'MaydAI_LLM_Control_Tower.csv',
      content: 'slug\n',
    })

    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'existing-1',
        supportsAllDrives: true,
      }),
    )
    expect(result).toEqual({ id: 'existing-1', updated: true })
  })

  test('lists a file by exact name inside the parent folder', async () => {
    mockList.mockResolvedValue({
      data: { files: [{ id: 'md-1', name: 'Claude_Sonnet_3.5_2024-06-20_03_Audit_FR_V2.md' }] },
    })

    const fileId = await findFileIdInFolder(
      '1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ',
      'Claude_Sonnet_3.5_2024-06-20_03_Audit_FR_V2.md',
    )

    expect(fileId).toBe('md-1')
    expect(mockList).toHaveBeenCalledWith({
      q: "name='Claude_Sonnet_3.5_2024-06-20_03_Audit_FR_V2.md' and '1XKR_mqtxiHOkXB3BGY5wszm3ODK1gNUZ' in parents and trashed=false",
      fields: 'files(id, name)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    })
  })

  test('downloads native files with alt=media after reading mimeType', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { id: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_', name: 'fiche.md', mimeType: 'text/plain' },
      })
      .mockResolvedValueOnce({ data: '# Fiche\n' })

    await expect(getFileFromDrive('1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_')).resolves.toBe('# Fiche\n')
    expect(mockExport).not.toHaveBeenCalled()
    expect(mockGet).toHaveBeenNthCalledWith(1, {
      fileId: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_',
      fields: 'id,name,mimeType',
      supportsAllDrives: true,
    })
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      { fileId: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_', alt: 'media', supportsAllDrives: true },
      { responseType: 'text' },
    )
  })

  test('returns the Drive file name with the text content', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { id: 'file-1', name: 'Claude_3.7_2024-06-20.md', mimeType: 'text/plain' },
      })
      .mockResolvedValueOnce({ data: '# Fiche\n' })

    await expect(getDriveFileText('file-1')).resolves.toEqual({
      content: '# Fiche\n',
      name: 'Claude_3.7_2024-06-20.md',
    })
  })

  test('exports Google Docs as text/plain', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_',
        name: 'fiche',
        mimeType: 'application/vnd.google-apps.document',
      },
    })
    mockExport.mockResolvedValueOnce({ data: '# Fiche exportée\n' })

    await expect(getFileFromDrive('1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_')).resolves.toBe(
      '# Fiche exportée\n',
    )
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockExport).toHaveBeenCalledWith(
      { fileId: '1_c_nWKfM6Yfj9cf4Mb_f6Sv79mHIyVM_', mimeType: 'text/plain' },
      { responseType: 'text' },
    )
  })
})
