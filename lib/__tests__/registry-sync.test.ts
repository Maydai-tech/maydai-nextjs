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
    test('should update all use cases with "Yes - MaydAI" response', async () => {
      const mockUseCases = [
        { id: 'usecase-1' },
        { id: 'usecase-2' },
        { id: 'usecase-3' }
      ]

      // Mock the select query for use cases
      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: mockUseCases,
        error: null
      })

      // Mock the upsert operations
      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: mockSelect,
            eq: mockEq
          }
        } else if (table === 'usecase_responses') {
          return {
            upsert: mockUpsert
          }
        }
      })

      const result = await updateUseCaseRegistryResponses(
        companyId,
        true,
        userEmail,
        mockSupabase
      )

      // Verify result
      expect(result.success).toBe(true)
      expect(result.updatedCount).toBe(3)
      expect(result.error).toBeUndefined()

      // Verify select was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('usecases')
      expect(mockSelect).toHaveBeenCalledWith('id')
      expect(mockEq).toHaveBeenCalledWith('company_id', companyId)

      // Verify upsert was called for each use case
      expect(mockUpsert).toHaveBeenCalledTimes(3)

      // Verify the data structure for MaydAI declaration
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          usecase_id: 'usecase-1',
          question_code: 'E5.N9.Q7',
          conditional_main: 'E5.N9.Q7.B',
          conditional_keys: ['system_name'],
          conditional_values: ['MaydAI'],
          single_value: null,
          multiple_codes: null,
          multiple_labels: null,
          answered_by: userEmail
        }),
        {
          onConflict: 'usecase_id,question_code',
          ignoreDuplicates: false
        }
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
    test('should reset all use cases to "No" response', async () => {
      const mockUseCases = [
        { id: 'usecase-1' },
        { id: 'usecase-2' }
      ]

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: mockUseCases,
        error: null
      })

      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: mockSelect,
            eq: mockEq
          }
        } else if (table === 'usecase_responses') {
          return {
            upsert: mockUpsert
          }
        }
      })

      const result = await updateUseCaseRegistryResponses(
        companyId,
        false,
        userEmail,
        mockSupabase
      )

      expect(result.success).toBe(true)
      expect(result.updatedCount).toBe(2)

      // Verify the data structure for removal (No response)
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          usecase_id: 'usecase-1',
          question_code: 'E5.N9.Q7',
          conditional_main: null,
          conditional_keys: null,
          conditional_values: null,
          single_value: 'E5.N9.Q7.A',
          multiple_codes: null,
          multiple_labels: null,
          answered_by: userEmail
        }),
        {
          onConflict: 'usecase_id,question_code',
          ignoreDuplicates: false
        }
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

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: mockUseCases,
        error: null
      })

      // Mock upsert to fail on the second call
      const mockUpsert = jest.fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Upsert failed' } })
        .mockResolvedValueOnce({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: mockSelect,
            eq: mockEq
          }
        } else if (table === 'usecase_responses') {
          return {
            upsert: mockUpsert
          }
        }
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
    test('should always overwrite existing responses', async () => {
      const mockUseCases = [{ id: 'usecase-1' }]

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: mockUseCases,
        error: null
      })

      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: mockSelect,
            eq: mockEq
          }
        } else if (table === 'usecase_responses') {
          return {
            upsert: mockUpsert
          }
        }
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

      const mockSelect = jest.fn().mockReturnThis()
      const mockEq = jest.fn().mockResolvedValue({
        data: mockUseCases,
        error: null
      })

      const mockUpsert = jest.fn().mockResolvedValue({ error: null })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'usecases') {
          return {
            select: mockSelect,
            eq: mockEq
          }
        } else if (table === 'usecase_responses') {
          return {
            upsert: mockUpsert
          }
        }
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
