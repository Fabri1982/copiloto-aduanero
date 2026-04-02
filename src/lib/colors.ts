export const statusColors = {
  success: {
    bg: 'bg-[var(--success-soft)]',
    text: 'text-[var(--success)]',
    border: 'border-[var(--success)]',
  },
  warning: {
    bg: 'bg-[var(--warning-soft)]',
    text: 'text-[var(--warning)]',
    border: 'border-[var(--warning)]',
  },
  error: {
    bg: 'bg-[var(--error-soft)]',
    text: 'text-[var(--error)]',
    border: 'border-[var(--error)]',
  },
  primary: {
    bg: 'bg-[var(--primary-soft)]',
    text: 'text-[var(--primary)]',
    border: 'border-[var(--primary)]',
  },
} as const

export type StatusType = keyof typeof statusColors
