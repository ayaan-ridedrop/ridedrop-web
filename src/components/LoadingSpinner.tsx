/**
 * Reusable loading spinner component
 * Shows inline or as overlay
 */

export function LoadingSpinner({ size = 'md', inline = false }: { size?: 'sm' | 'md' | 'lg'; inline?: boolean }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  const spinner = (
    <svg className={`${sizeClass} animate-spin text-accent`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  if (inline) return spinner;

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
}

/**
 * Loading button state
 */
export function LoadingButton({ loading, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...props} disabled={loading || props.disabled} className={props.className + ' disabled:opacity-50 transition'}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" inline />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
