import * as React from 'react'
import { cn } from '@/lib/utils/cn'

/** Select natif stylé façon shadcn (sans @radix-ui). */
export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, label, id, children, ...props }, ref) => {
    const autoId = React.useId()
    const selectId = id ?? autoId
    return (
      <div className="grid w-full min-w-[200px] max-w-full gap-1.5 sm:max-w-xs">
        {label ? (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-gray-600"
          >
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  }
)
NativeSelect.displayName = 'NativeSelect'

export { NativeSelect }
