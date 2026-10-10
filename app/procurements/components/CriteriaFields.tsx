'use client'
import { PROCUREMENT_CRITERIA, type CriteriaImportance, type CriterionId } from '@/lib/validations/procurement'
import { errorProps, FieldError, fieldId, FOCUS_RING, type FieldErrors } from './form-ui'

export default function CriteriaFields({ values, onChange, disabled, errors }: { values: CriteriaImportance; onChange: (id: CriterionId, value: number) => void; disabled: boolean; errors: FieldErrors }) {
  return <div id={fieldId('criteria_importance')} tabIndex={-1} className="grid sm:grid-cols-2 gap-4" {...errorProps('criteria_importance', errors)}>{PROCUREMENT_CRITERIA.map((criterion) => {
    const path = `criteria_importance.${criterion.id}`
    return <div key={criterion.id} className="rounded-lg border border-gray-200 p-4">
      <h3 className="font-medium text-gray-900">{criterion.label}</h3><p className="mt-1 min-h-10 text-sm text-gray-600">{criterion.description}</p>
      <div className="mt-4 flex items-center gap-4">
        <label htmlFor={fieldId(path)} className="sr-only">Importance : {criterion.label}</label>
        <input id={fieldId(path)} type="range" min={0} max={10} step={1} value={Number.isFinite(values[criterion.id]) ? values[criterion.id] : 0} onChange={(event) => onChange(criterion.id, Number(event.target.value))} disabled={disabled} className={`min-w-0 flex-1 h-11 accent-[#0080A3] rounded ${FOCUS_RING}`} {...errorProps(path, errors)} />
        <div className="flex items-center gap-1"><label htmlFor={`${fieldId(path)}-number`} className="sr-only">Valeur d’importance : {criterion.label}</label><input id={`${fieldId(path)}-number`} type="number" required inputMode="numeric" min={0} max={10} step={1} value={Number.isFinite(values[criterion.id]) ? values[criterion.id] : ''} onChange={(event) => onChange(criterion.id, event.target.value === '' ? NaN : Number(event.target.value))} disabled={disabled} className={`h-11 w-16 rounded-lg border border-gray-300 px-2 text-center text-base font-semibold text-gray-900 ${FOCUS_RING}`} {...errorProps(path, errors)} /><span className="text-sm text-gray-500">/ 10</span></div>
      </div><div className="flex justify-between text-xs text-gray-500"><span>Priorité minimale</span><span>Priorité maximale</span></div><FieldError path={path} errors={errors} />
    </div>
  })}</div>
}
