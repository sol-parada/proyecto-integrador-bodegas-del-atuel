interface MaterialIconProps {
  name: string
  className?: string
}

export function MaterialIcon({ name, className = '' }: MaterialIconProps) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}
