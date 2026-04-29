import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${className}`}>
      <div className="font-semibold text-slate-800">{children}</div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

interface CardSectionProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`px-6 py-4 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  )
}
