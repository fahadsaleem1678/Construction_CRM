import { InputHTMLAttributes, useId } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function TextField({ label, error, hint, className = '', ...props }: TextFieldProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium text-sc-sub">{label}</label>
      <input
        id={id}
        {...props}
        className={['h-10 w-full rounded-lg border px-3.5 text-sm bg-sc-surface text-sc-text placeholder:text-sc-muted/75', error ? 'border-sc-red focus:border-sc-red focus:ring-sc-red/30' : 'border-sc-border focus:border-sc-amber focus:ring-sc-amber/25', 'focus:outline-none focus:ring-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40', className].join(' ')}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-sc-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-300" role="alert">{error}</p>}
    </div>
  );
}
