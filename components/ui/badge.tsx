import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'border-transparent bg-[#0080A3] text-white hover:bg-[#006280]',
  secondary:
    'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
  destructive:
    'border-transparent bg-red-600 text-white hover:bg-red-700',
  outline: 'text-gray-950 border-gray-300 bg-transparent',
  success:
    'border-transparent bg-emerald-100 text-emerald-900',
  warning:
    'border-transparent bg-amber-100 text-amber-950',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
