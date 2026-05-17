/**
 * Alert component for showing errors, warnings, and success messages
 */

type AlertType = 'error' | 'warning' | 'success' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const alertStyles: Record<AlertType, { bg: string; border: string; icon: string; textTitle: string; textBody: string }> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '⚠️',
    textTitle: 'text-red-900',
    textBody: 'text-red-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '⚡',
    textTitle: 'text-amber-900',
    textBody: 'text-amber-700',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✓',
    textTitle: 'text-green-900',
    textBody: 'text-green-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'ℹ',
    textTitle: 'text-blue-900',
    textBody: 'text-blue-700',
  },
};

export default function Alert({ type, title, message, onDismiss }: AlertProps) {
  const styles = alertStyles[type];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-lg p-4 flex gap-3`}>
      <div className="text-lg flex-shrink-0">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <p className={`font-medium ${styles.textTitle} mb-1`}>{title}</p>}
        <p className={`text-sm ${styles.textBody}`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 text-xl leading-none opacity-40 hover:opacity-60 transition`}
        >
          ×
        </button>
      )}
    </div>
  );
}
