import { updateUseCaseRegistryResponses } from '../registry-sync'
import { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockClient = {
    from: jest.fn()
  } as unknown as SupabaseClient

  return mockClient
}

describe('updateUseCaseRegistryResponses', () => {
  let mockSupabase: SupabaseClient
  const companyId = 'test-company-id'
  const userEmail = 'test@example.com'

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    jest.clearAllMocks()
  })

  describe('when MaydAI is declared as centralized registry', () => {
    test('should update only use cases with "No" or no response (not "Oui + other")', async () => {
      const mockUseCases = [
        { id: 'usecase-1' },
        { id: 'usecase-2' },
        { id: 'usecase-3' }
      ]
      // No existing responses => all 3 get "Oui + MaydAI"
      const existingResponses: any[] = []

      const mockUseCasesSelect = jest.fn().mockReturnThis()
      const mockUseCasesEq = jest.fn().mockResolvedValue({
        data: mockUseCases,
        error: null
      })
      const mockResponsesSelect = jest.fn().mockReturnThis()
      const mockResponsesEq = jest.fn().mockReturnThis()
      const mockResponsesIn = jest.fn().mockResolvedValue({
        data: existingResponses,
        error: null
      })
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: mockUseCasesSelect,
            eq: mockUseCasesEq
          }
        }
        if (table === 'usecase_responses') {
          return {
            select: mockResponsesSelect,
            eq: mockResponsesEq,
            in: mockResponsesIn,
            upsert: mockUpsert
          }
        }
        return {}
      })

      const result = await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      expect(result.success).toBe(true)
      expect(result.updatedCount).toBe(3)
      expect(result.error).toBeUndefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('usecases')
      expect(mockUseCasesSelect).toHaveBeenCalledWith('id')
      expect(mockUseCasesEq).toHaveBeenCalledWith('company_id', companyId)
      expect(mockResponsesIn).toHaveBeenCalled()
      expect(mockUpsert).toHaveBeenCalledTimes(3)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          usecase_id: 'usecase-1',
          question_code: 'E5.N9.Q7',
          conditional_main: 'E5.N9.Q7.B',
          conditional_keys: ['system_name'],
          conditional_values: ['MaydAI'],
          single_value: null,
          answered_by: userEmail
        }),
        expect.any(Object)
      )
    })

    test('should return 0 updated count when company has no use cases', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null
      })

      ;(mockSupabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq
      })

      const result = await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      expect(result.success).toBe(true)
      expect(result.updatedCount).toBe(0)
    })
  })

  describe('when MaydAI is removed as centralized registry', () => {
    test('should reset only use cases with "Oui + MaydAI" to "No"', async () => {
      const mockUseCases = [
        { id: 'usecase-1' },
        { id: 'usecase-2' }
      ]
      // Both have "Oui + MaydAI" => both get reset to "Non"
      const existingResponses = [
        { usecase_id: 'usecase-1', single_value: null, conditional_main: 'E5.N9.Q7.B', conditional_values: ['MaydAI'] },
        { usecase_id: 'usecase-2', single_value: null, conditional_main: 'E5.N9.Q7.B', conditional_values: ['MaydAI'] }
      ]

      const mockUseCasesSelect = jest.fn().mockReturnThis()
      const mockUseCasesEq = jest.fn().mockResolvedValue({
        data: mockUseCases,
        error: null
      })
      const mockResponsesSelect = jest.fn().mockReturnThis()
      const mockResponsesEq = jest.fn().mockReturnThis()
      const mockResponsesIn = jest.fn().mockResolvedValue({
        data: existingResponses,
        error: null
      })
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: mockUseCasesSelect,
            eq: mockUseCasesEq
          }
        }
        if (table === 'usecase_responses') {
          return {
            select: mockResponsesSelect,
            eq: mockResponsesEq,
            in: mockResponsesIn,
            upsert: mockUpsert
          }
        }
        return {}
      })

      const result = await updateUseCaseRegistryResponses(
        companyId,
        false,
        userEmail,
        mockSupabase
      )

      expect(result.success).toBe(true)
      expect(result.updatedCount).toBe(2)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          usecase_id: 'usecase-1',
          question_code: 'E5.N9.Q7',
          conditional_main: null,
          conditional_keys: null,
          conditional_values: null,
          single_value: 'E5.N9.Q7.A',
          answered_by: userEmail
        }),
        expect.any(Object)
      )
    })
  })

  describe('error handling', () => {
    test('should handle fetch error gracefully', async () => {
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => ({
        select: mockSelect,
        eq: mockEq
      }))

      const result = await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      expect(result.success).toBe(false)
      expect(result.updatedCount).toBe(0)
      expect(result.error).toBe('Database connection failed')
    })

    test('should handle partial upsert failures', async () => {
      const mockUseCases = [
        { id: 'usecase-1' },
        { id: 'usecase-2' },
        { id: 'usecase-3' }
      ]
      const mockResponsesIn = jest.fn().mockResolvedValue({ data: [], error: null })
      const mockUpsert = jest.fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Upsert failed' } })
        .mockResolvedValueOnce({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockUseCases, error: null })
          }
        }
        if (table === 'usecase_responses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: mockResponsesIn,
            upsert: mockUpsert
          }
        }
        return {}
      })

      const result = await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      expect(result.success).toBe(false)
      expect(result.updatedCount).toBe(2)
      expect(result.error).toBe('1 use case(s) failed to update')
    })

    test('should handle unexpected errors', async () => {
      // Make from() throw an error
      ;(mockSupabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      expect(result.success).toBe(false)
      expect(result.updatedCount).toBe(0)
      expect(result.error).toBe('Unexpected error')
    })
  })

  describe('data integrity', () => {
    test('should overwrite when updating (ignoreDuplicates false)', async () => {
      const mockUseCases = [{ id: 'usecase-1' }]
      const mockResponsesIn = jest.fn().mockResolvedValue({ data: [], error: null })
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockUseCases, error: null })
          }
        }
        if (table === 'usecase_responses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: mockResponsesIn,
            upsert: mockUpsert
          }
        }
        return {}
      })

      await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      // Verify that ignoreDuplicates is set to false (overwrites existing)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ignoreDuplicates: false
        })
      )
    })

    test('should include timestamp fields', async () => {
      const mockUseCases = [{ id: 'usecase-1' }]
      const mockResponsesIn = jest.fn().mockResolvedValue({ data: [], error: null })
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockUseCases, error: null })
          }
        }
        if (table === 'usecase_responses') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: mockResponsesIn,
            upsert: mockUpsert
          }
        }
        return {}
      })

      await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      // Verify timestamps are included
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          answered_at: expect.any(String),
          updated_at: expect.any(String)
        }),
        expect.any(Object)
      )
    })
  })
})
