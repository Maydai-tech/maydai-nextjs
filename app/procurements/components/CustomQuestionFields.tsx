'use client'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { QUESTION_TYPES, type ProcurementQuestion } from '@/lib/validations/procurement'
import { errorProps, FieldError, fieldId, FOCUS_RING, INPUT_STYLE, type FieldErrors } from './form-ui'

export default function CustomQuestionFields({ questions, onChange, disabled, errors }: { questions: ProcurementQuestion[]; onChange: (questions: ProcurementQuestion[]) => void; disabled: boolean; errors: FieldErrors }) {
  const update = (index: number, question: ProcurementQuestion) => onChange(questions.map((item, i) => i === index ? question : item))
  function move(index: number, offset: number) {
    const items = [...questions]; [items[index], items[index + offset]] = [items[index + offset], items[index]]; onChange(items)
  }
  return <div id={fieldId('custom_questions')} tabIndex={-1} className="space-y-4" {...errorProps('custom_questions', errors)}>
    {questions.length === 0 && <p className="text-sm text-gray-600">Ajoutez vos questions métier si nécessaire. Elles ne participent pas au score.</p>}
    {questions.map((question, index) => {
      const root = `custom_questions.${index}`
      const choices = question.type === 'single_choice' || question.type === 'multiple_choice'
      return <fieldset key={question.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Question {index + 1}</legend>
        <div className="flex flex-wrap items-center justify-end gap-1 mb-3">
          <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label={`Monter la question ${index + 1}`} className={`h-11 w-11 flex items-center justify-center rounded-lg hover:bg-gray-200 disabled:opacity-30 ${FOCUS_RING}`}><ArrowUp size={18} aria-hidden="true" /></button>
          <button type="button" disabled={disabled || index === questions.length - 1} onClick={() => move(index, 1)} aria-label={`Descendre la question ${index + 1}`} className={`h-11 w-11 flex items-center justify-center rounded-lg hover:bg-gray-200 disabled:opacity-30 ${FOCUS_RING}`}><ArrowDown size={18} aria-hidden="true" /></button>
          <button type="button" disabled={disabled} onClick={() => onChange(questions.filter((_, i) => i !== index))} aria-label={`Supprimer la question ${index + 1}`} className={`h-11 w-11 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 ${FOCUS_RING}`}><Trash2 size={18} aria-hidden="true" /></button>
        </div>
        <label htmlFor={fieldId(`${root}.label`)} className="block text-sm font-medium text-gray-700 mb-2">Intitulé</label>
        <input id={fieldId(`${root}.label`)} value={question.label} required maxLength={2000} disabled={disabled} onChange={(event) => update(index, { ...question, label: event.target.value })} className={INPUT_STYLE} {...errorProps(`${root}.label`, errors)} /><FieldError path={`${root}.label`} errors={errors} />
        <label htmlFor={fieldId(`${root}.type`)} className="block text-sm font-medium text-gray-700 mt-4 mb-2">Type de réponse</label>
        <select id={fieldId(`${root}.type`)} value={question.type} disabled={disabled} className={INPUT_STYLE} onChange={(event) => {
          const type = event.target.value as ProcurementQuestion['type']
          update(index, type === 'single_choice' || type === 'multiple_choice' ? { id: question.id, label: question.label, type, options: choices ? question.options : ['', ''] } : { id: question.id, label: question.label, type })
        }}>{Object.entries(QUESTION_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {choices && <div id={fieldId(`${root}.options`)} tabIndex={-1} className="mt-4 space-y-3" {...errorProps(`${root}.options`, errors)}><p className="text-sm font-medium text-gray-700">Options de réponse</p>{question.options.map((option, optionIndex) => {
          const path = `${root}.options.${optionIndex}`
          return <div key={optionIndex}><div className="flex items-center gap-2"><label htmlFor={fieldId(path)} className="sr-only">Option {optionIndex + 1} de la question {index + 1}</label><input id={fieldId(path)} value={option} maxLength={200} disabled={disabled} className={INPUT_STYLE} {...errorProps(path, errors)} onChange={(event) => update(index, { ...question, options: question.options.map((value, i) => i === optionIndex ? event.target.value : value) })} /><button type="button" disabled={disabled} aria-label={`Supprimer l’option ${optionIndex + 1} de la question ${index + 1}`} onClick={() => update(index, { ...question, options: question.options.filter((_, i) => i !== optionIndex) })} className={`h-11 w-11 flex shrink-0 items-center justify-center rounded-lg hover:bg-gray-200 ${FOCUS_RING}`}><Trash2 size={16} aria-hidden="true" /></button></div><FieldError path={path} errors={errors} /></div>
        })}<FieldError path={`${root}.options`} errors={errors} /><button type="button" disabled={disabled} onClick={() => update(index, { ...question, options: [...question.options, ''] })} className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-[#0080A3] ${FOCUS_RING}`}><Plus size={16} aria-hidden="true" />Ajouter une option</button></div>}
        {question.type === 'file' && <p className="mt-3 text-sm text-gray-600">Le fournisseur pourra joindre un fichier lors de la future collecte des réponses.</p>}
      </fieldset>
    })}
    <FieldError path="custom_questions" errors={errors} />
    <button type="button" disabled={disabled} onClick={() => onChange([...questions, { id: crypto.randomUUID(), label: '', type: 'short_text' }])} className={`w-full min-h-11 inline-flex justify-center items-center gap-2 rounded-lg border border-dashed border-[#0080A3]/40 px-4 py-3 text-sm font-medium text-[#0080A3] hover:bg-[#0080A3]/5 ${FOCUS_RING}`}><Plus size={18} aria-hidden="true" />Ajouter une question sur mesure</button>
  </div>
}
