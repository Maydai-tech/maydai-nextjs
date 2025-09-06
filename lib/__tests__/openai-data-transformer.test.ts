import { 
  transformToOpenAIFormat, 
  extractTargetResponses, 
  validateOpenAIInput 
} from '../openai-data-transformer'

interface UseCaseResponse {
  question_code: string
  single_value?: string
  multiple_codes?: string[]
  multiple_labels?: string[]
  conditional_main?: string
  conditional_keys?: string[]
  conditional_values?: string[]
}

describe('OpenAI Data Transformer', () => {
  const mockResponses: UseCaseResponse[] = [
    {
      question_code: 'E4.N7.Q2',
      multiple_codes: ['E4.N7.Q2.A', 'E4.N7.Q2.B'],
      multiple_labels: [
        'Emploi, gestion des travailleurs et accès à l\'emploi indépendant',
        'Administration de la justice et processus démocratiques'
      ]
    },
    {
      question_code: 'E5.N9.Q7',
      conditional_main: 'E5.N9.Q7.B',
      conditional_keys: ['registry_type', 'system_name'],
      conditional_values: ['Interne', 'MaydAI']
    }
  ]

  describe('transformToOpenAIFormat', () => {
    it('should transform data to OpenAI format correctly', () => {
      const result = transformToOpenAIFormat(
        'uuid-du-cas-dusage', 
        'Assistant RH IA – sélection de candidats', 
        mockResponses
      )
      
      expect(result).toEqual({
        usecase_id: 'uuid-du-cas-dusage',
        usecase_name: 'Assistant RH IA – sélection de candidats',
        responses: {
          E4_N7_Q2: {
            question: 'Votre système d\'IA est utilisé dans un ou des domaines suivants ?',
            selected_options: ['E4.N7.Q2.A', 'E4.N7.Q2.B'],
            selected_labels: [
              'Emploi, gestion des travailleurs et accès à l\'emploi indépendant',
              'Administration de la justice et processus démocratiques'
            ]
          },
          E5_N9_Q7: {
            question: 'Tenez vous un registre centralisé de vos systèmes d\'IA ?',
            selected_option: 'E5.N9.Q7.B',
            selected_label: 'Oui',
            conditional_data: {
              registry_type: 'Interne',
              system_name: 'MaydAI'
            }
          }
        }
      })
    })

    it('should handle missing responses gracefully', () => {
      const emptyResponses: UseCaseResponse[] = []
      const result = transformToOpenAIFormat(
        'uuid-test', 
        'Test Use Case', 
        emptyResponses
      )
      
      expect(result.usecase_id).toBe('uuid-test')
      expect(result.usecase_name).toBe('Test Use Case')
      expect(result.responses.E4_N7_Q2.selected_options).toEqual([])
      expect(result.responses.E4_N7_Q2.selected_labels).toEqual([])
      expect(result.responses.E5_N9_Q7.selected_option).toBe('')
      expect(result.responses.E5_N9_Q7.selected_label).toBe('')
      expect(result.responses.E5_N9_Q7.conditional_data).toEqual({})
    })

    it('should handle responses with only codes (no labels)', () => {
      const responsesWithCodesOnly: UseCaseResponse[] = [
        {
          question_code: 'E4.N7.Q2',
          multiple_codes: ['E4.N7.Q2.A', 'E4.N7.Q2.G'],
          multiple_labels: [] // Pas de labels
        }
      ]
      
      const result = transformToOpenAIFormat(
        'uuid-test', 
        'Test Use Case', 
        responsesWithCodesOnly
      )
      
      expect(result.responses.E4_N7_Q2.selected_options).toEqual(['E4.N7.Q2.A', 'E4.N7.Q2.G'])
      expect(result.responses.E4_N7_Q2.selected_labels).toHaveLength(2)
      expect(result.responses.E4_N7_Q2.selected_labels[0]).toContain('Emploi')
      expect(result.responses.E4_N7_Q2.selected_labels[1]).toContain('Aucun')
    })

    it('should handle conditional response with missing conditional data', () => {
      const responsesWithoutConditional: UseCaseResponse[] = [
        {
          question_code: 'E5.N9.Q7',
          conditional_main: 'E5.N9.Q7.A' // "Non"
        }
      ]
      
      const result = transformToOpenAIFormat(
        'uuid-test', 
        'Test Use Case', 
        responsesWithoutConditional
      )
      
      expect(result.responses.E5_N9_Q7.selected_option).toBe('E5.N9.Q7.A')
      expect(result.responses.E5_N9_Q7.selected_label).toBe('Non')
      expect(result.responses.E5_N9_Q7.conditional_data).toEqual({})
    })
  })

  describe('extractTargetResponses', () => {
    it('should extract only target responses', () => {
      const allResponses = [
        ...mockResponses,
        { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.A' },
        { question_code: 'E5.N9.Q8', conditional_main: 'E5.N9.Q8.B' }
      ]
      
      const targetResponses = extractTargetResponses(allResponses)
      
      expect(targetResponses).toHaveLength(2)
      expect(targetResponses.map(r => r.question_code)).toEqual(['E4.N7.Q2', 'E5.N9.Q7'])
    })

    it('should return empty array when no target responses', () => {
      const otherResponses = [
        { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.A' },
        { question_code: 'E5.N9.Q8', conditional_main: 'E5.N9.Q8.B' }
      ]
      
      const targetResponses = extractTargetResponses(otherResponses)
      
      expect(targetResponses).toHaveLength(0)
    })
  })

  describe('validateOpenAIInput', () => {
    it('should validate correct data', () => {
      const validData = {
        usecase_id: 'uuid-test',
        usecase_name: 'Test Use Case',
        responses: {
          E4_N7_Q2: {
            question: 'Test question',
            selected_options: ['E4.N7.Q2.A'],
            selected_labels: ['Test label']
          },
          E5_N9_Q7: {
            question: 'Test question',
            selected_option: 'E5.N9.Q7.B',
            selected_label: 'Oui',
            conditional_data: {}
          }
        }
      }
      
      const result = validateOpenAIInput(validData)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing usecase_id', () => {
      const invalidData = {
        usecase_id: '',
        usecase_name: 'Test Use Case',
        responses: {
          E4_N7_Q2: {
            question: 'Test question',
            selected_options: ['E4.N7.Q2.A'],
            selected_labels: ['Test label']
          },
          E5_N9_Q7: {
            question: 'Test question',
            selected_option: 'E5.N9.Q7.B',
            selected_label: 'Oui',
            conditional_data: {}
          }
        }
      }
      
      const result = validateOpenAIInput(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('usecase_id is required')
    })

    it('should detect missing E4.N7.Q2 options', () => {
      const invalidData = {
        usecase_id: 'uuid-test',
        usecase_name: 'Test Use Case',
        responses: {
          E4_N7_Q2: {
            question: 'Test question',
            selected_options: [],
            selected_labels: []
          },
          E5_N9_Q7: {
            question: 'Test question',
            selected_option: 'E5.N9.Q7.B',
            selected_label: 'Oui',
            conditional_data: {}
          }
        }
      }
      
      const result = validateOpenAIInput(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('E4.N7.Q2 must have at least one selected option')
    })

    it('should detect missing E5.N9.Q7 option', () => {
      const invalidData = {
        usecase_id: 'uuid-test',
        usecase_name: 'Test Use Case',
        responses: {
          E4_N7_Q2: {
            question: 'Test question',
            selected_options: ['E4.N7.Q2.A'],
            selected_labels: ['Test label']
          },
          E5_N9_Q7: {
            question: 'Test question',
            selected_option: '',
            selected_label: '',
            conditional_data: {}
          }
        }
      }
      
      const result = validateOpenAIInput(invalidData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('E5.N9.Q7 must have a selected option')
    })
  })
})

