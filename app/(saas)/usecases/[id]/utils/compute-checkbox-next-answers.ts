import type { QuestionOption } from '../types/usecase'

/** Logique partagée parcours long / court : exclusion `unique_answer` (« Aucun ») vs options standard. */
export function computeCheckboxNextAnswers(
  checkboxAnswers: string[],
  allOptions: QuestionOption[],
  option: QuestionOption,
  checked: boolean
): string[] {
  let newAnswers: string[]
  if (checked) {
    if (option.unique_answer) {
      newAnswers = [option.code]
    } else {
      const uniqueOptions = allOptions.filter((opt) => opt.unique_answer)
      const hasUniqueSelected = checkboxAnswers.some((answer) =>
        uniqueOptions.some((unique) => unique.code === answer)
      )

      if (hasUniqueSelected) {
        const filteredAnswers = checkboxAnswers.filter(
          (answer) => !uniqueOptions.some((unique) => unique.code === answer)
        )
        newAnswers = [...filteredAnswers, option.code]
      } else {
        newAnswers = [...checkboxAnswers, option.code]
      }
    }
  } else {
    newAnswers = checkboxAnswers.filter((item: string) => item !== option.code)
  }
  return newAnswers
}
