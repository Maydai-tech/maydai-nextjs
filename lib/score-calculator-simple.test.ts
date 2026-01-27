import {
  calculateBaseScore,
  calculateFinalScore,
  getSelectedCodes,
  findQuestionOption,
  roundToTwoDecimals,
  BASE_SCORE,
  COMPL_AI_MULTIPLIER,
  BASE_SCORE_WEIGHT,
  MODEL_SCORE_WEIGHT,
  TOTAL_WEIGHT,
  type UserResponse,
} from './score-calculator-simple';

describe('Score Calculator', () => {
  describe('roundToTwoDecimals', () => {
    it('should round numbers to 2 decimal places', () => {
      expect(roundToTwoDecimals(15.666)).toBe(15.67);
      expect(roundToTwoDecimals(15.664)).toBe(15.66);
      expect(roundToTwoDecimals(15)).toBe(15);
      expect(roundToTwoDecimals(15.1)).toBe(15.1);
    });
  });

  describe('getSelectedCodes', () => {
    it('should extract single value from radio response', () => {
      const response: UserResponse = {
        question_code: 'E4.N7.Q1',
        single_value: 'E4.N7.Q1.A',
      };
      expect(getSelectedCodes(response)).toEqual(['E4.N7.Q1.A']);
    });

    it('should handle quoted single values', () => {
      const response: UserResponse = {
        question_code: 'E4.N7.Q1',
        single_value: '"E4.N7.Q1.A"',
      };
      expect(getSelectedCodes(response)).toEqual(['E4.N7.Q1.A']);
    });

    it('should extract multiple codes from checkbox response', () => {
      const response: UserResponse = {
        question_code: 'E4.N7.Q2',
        multiple_codes: ['E4.N7.Q2.A', 'E4.N7.Q2.B'],
      };
      expect(getSelectedCodes(response)).toEqual(['E4.N7.Q2.A', 'E4.N7.Q2.B']);
    });

    it('should extract conditional main value', () => {
      const response: UserResponse = {
        question_code: 'E5.N9.Q6',
        conditional_main: 'E5.N9.Q6.B',
        conditional_keys: ['procedures_details'],
        conditional_values: ['Test procedure'],
      };
      expect(getSelectedCodes(response)).toEqual(['E5.N9.Q6.B']);
    });

    it('should return empty array for no response', () => {
      const response: UserResponse = {
        question_code: 'E4.N7.Q1',
      };
      expect(getSelectedCodes(response)).toEqual([]);
    });
  });

  describe('findQuestionOption', () => {
    it('should find valid option', () => {
      const option = findQuestionOption('E4.N7.Q1', 'E4.N7.Q1.A');
      expect(option).toBeDefined();
      expect(option?.code).toBe('E4.N7.Q1.A');
      expect(option?.label).toBe("Mon entreprise travaille dans le domaine de l'informatique et de l'IA");
    });

    it('should return null for invalid question', () => {
      const option = findQuestionOption('INVALID', 'E4.N7.Q1.A');
      expect(option).toBeNull();
    });

    it('should return null for invalid option', () => {
      const option = findQuestionOption('E4.N7.Q1', 'INVALID');
      expect(option).toBeNull();
    });
  });

  describe('calculateBaseScore', () => {
    it('should return base score for no responses', () => {
      const result = calculateBaseScore([]);
      expect(result.score_base).toBe(BASE_SCORE);
      expect(result.is_eliminated).toBe(false);
      expect(result.elimination_reason).toBe('');
    });

    it('should apply negative impacts from responses', () => {
      const responses: UserResponse[] = [
        {
          question_code: 'E4.N7.Q2',
          multiple_codes: ['E4.N7.Q2.A'], // -30 impact (mis à jour selon CSV)
        },
        {
          question_code: 'E4.N8.Q2',
          single_value: 'E4.N8.Q2.A', // -5 impact
        },
      ];
      const result = calculateBaseScore(responses);
      expect(result.score_base).toBe(BASE_SCORE - 30 - 5); // 90 - 30 - 5 = 55
      expect(result.is_eliminated).toBe(false);
      expect(result.calculation_details.total_impact).toBe(-35);
    });

    it('should handle eliminatory responses', () => {
      const responses: UserResponse[] = [
        {
          question_code: 'E4.N7.Q3',
          multiple_codes: ['E4.N7.Q3.A'], // Eliminatory: identification biométrique
        },
      ];
      const result = calculateBaseScore(responses);
      expect(result.score_base).toBe(0);
      expect(result.is_eliminated).toBe(true);
      expect(result.elimination_reason).toContain('Identification biométrique');
    });

    it('should not go below 0 for non-eliminated cases', () => {
      const responses: UserResponse[] = [
        {
          question_code: 'E4.N7.Q2',
          multiple_codes: ['E4.N7.Q2.A', 'E4.N7.Q2.B', 'E4.N7.Q2.C'], // -90 total impact (3 × -30, mis à jour selon CSV)
        },
      ];
      const result = calculateBaseScore(responses);
      expect(result.score_base).toBe(0); // Can't go below 0
      expect(result.is_eliminated).toBe(false);
      expect(result.calculation_details.total_impact).toBe(-90);
    });

    it('should handle mixed response types', () => {
      const responses: UserResponse[] = [
        {
          question_code: 'E4.N7.Q1',
          single_value: 'E4.N7.Q1.A', // 0 impact
        },
        {
          question_code: 'E4.N8.Q11',
          multiple_codes: ['E4.N8.Q11.B', 'E4.N8.Q11.C'], // -6 total impact
        },
        {
          question_code: 'E5.N9.Q6',
          conditional_main: 'E5.N9.Q6.B', // 0 impact
          conditional_keys: ['procedures_details'],
          conditional_values: ['Quality checks'],
        },
      ];
      const result = calculateBaseScore(responses);
      expect(result.score_base).toBe(BASE_SCORE - 6); // 90 - 6 = 84
      expect(result.is_eliminated).toBe(false);
    });

    it('should ignore unknown questions', () => {
      const responses: UserResponse[] = [
        {
          question_code: 'UNKNOWN_QUESTION',
          single_value: 'UNKNOWN_ANSWER',
        },
        {
          question_code: 'E4.N8.Q2',
          single_value: 'E4.N8.Q2.A', // -5 impact
        },
      ];
      const result = calculateBaseScore(responses);
      expect(result.score_base).toBe(BASE_SCORE - 5); // Should only apply known impact
    });

    it('should handle responses with no impact', () => {
      const responses: UserResponse[] = [
        {
          question_code: 'E4.N7.Q1',
          single_value: 'E4.N7.Q1.A', // 0 impact
        },
        {
          question_code: 'E4.N7.Q1.1',
          single_value: 'E4.N7.Q1.1.A', // 0 impact
        },
        {
          question_code: 'E4.N7.Q2',
          multiple_codes: ['E4.N7.Q2.G'], // 0 impact (Aucun de ces domaines)
        },
      ];
      const result = calculateBaseScore(responses);
      expect(result.score_base).toBe(BASE_SCORE); // Should remain at base score
      expect(result.calculation_details.total_impact).toBe(0);
    });
  });

  describe('calculateFinalScore', () => {
    const baseResult = {
      score_base: 60,
      is_eliminated: false,
      elimination_reason: '',
      calculation_details: {
        base_score: BASE_SCORE,
        total_impact: -30,
        final_base_score: 60,
      },
    };

    it('should calculate final score without model score', () => {
      const result = calculateFinalScore(baseResult, null, 'test-123');
      
      // Formula: (60 + 0) / 120 * 100 = 50%
      expect(result.scores.score_final).toBe(50);
      expect(result.scores.score_base).toBe(60);
      expect(result.scores.score_model).toBeNull();
      expect(result.calculation_details.has_model_score).toBe(false);
    });

    it('should calculate final score with model score', () => {
      const modelScore = 15; // 15/20 = 75%
      const result = calculateFinalScore(baseResult, modelScore, 'test-123');
      
      // Formula: (60 + (0.75 * 20)) / 120 * 100 = (60 + 15) / 120 * 100 = 62.5%
      expect(result.scores.score_final).toBe(62.5);
      expect(result.scores.score_base).toBe(60);
      expect(result.scores.score_model).toBe(15);
      expect(result.calculation_details.model_percentage).toBe(75);
      expect(result.calculation_details.has_model_score).toBe(true);
    });

    it('should handle perfect model score', () => {
      const modelScore = 20; // 20/20 = 100%
      const result = calculateFinalScore(baseResult, modelScore, 'test-123');
      
      // Formula: (60 + (1.0 * 20)) / 120 * 100 = (60 + 20) / 120 * 100 = 66.67%
      expect(result.scores.score_final).toBe(66.67);
      expect(result.calculation_details.model_percentage).toBe(100);
    });

    it('should handle zero model score', () => {
      const modelScore = 0; // 0/20 = 0%
      const result = calculateFinalScore(baseResult, modelScore, 'test-123');
      
      // Formula: (60 + (0 * 20)) / 120 * 100 = 60 / 120 * 100 = 50%
      expect(result.scores.score_final).toBe(50);
      expect(result.calculation_details.model_percentage).toBe(0);
    });

    it('should return 0 for eliminated cases', () => {
      const eliminatedResult = {
        score_base: 0,
        is_eliminated: true,
        elimination_reason: 'Pratique interdite',
        calculation_details: {
          base_score: BASE_SCORE,
          total_impact: 0,
          final_base_score: 0,
        },
      };
      
      const result = calculateFinalScore(eliminatedResult, 20, 'test-123');
      expect(result.scores.score_final).toBe(0);
      expect(result.scores.is_eliminated).toBe(true);
      expect(result.scores.elimination_reason).toBe('Pratique interdite');
    });

    it('should calculate maximum possible score', () => {
      const maxBaseResult = {
        score_base: BASE_SCORE, // 90
        is_eliminated: false,
        elimination_reason: '',
        calculation_details: {
          base_score: BASE_SCORE,
          total_impact: 0,
          final_base_score: BASE_SCORE,
        },
      };
      
      const result = calculateFinalScore(maxBaseResult, 20, 'test-123');
      // Formula: (90 + 20) / 120 * 100 = 91.67%
      expect(result.scores.score_final).toBe(91.67);
    });

    it('should include correct formula in details', () => {
      const result = calculateFinalScore(baseResult, 10, 'test-123');
      expect(result.calculation_details.formula_used).toContain('60');
      expect(result.calculation_details.formula_used).toContain('10'); // model score raw value
      expect(result.calculation_details.formula_used).toContain('120');
    });

    it('should include correct weights in details', () => {
      const result = calculateFinalScore(baseResult, null, 'test-123');
      expect(result.calculation_details.weights.base_score_weight).toBe(BASE_SCORE_WEIGHT);
      expect(result.calculation_details.weights.model_score_weight).toBe(MODEL_SCORE_WEIGHT);
      expect(result.calculation_details.weights.total_weight).toBe(TOTAL_WEIGHT);
    });
  });
});