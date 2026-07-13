import { InputHTMLAttributes, useId } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, className = '', ...props }: TextFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-sc-sub"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={[
          'h-9 w-full rounded-md border px-3 text-sm',
          'bg-sc-surface text-sc-text placeholder:text-sc-muted',
          error
            ? 'border-sc-red focus:border-sc-red focus:ring-sc-red/40'
            : 'border-sc-border focus:border-sc-amber focus:ring-sc-amber/30',
          'focus:outline-none focus:ring-2',
          'transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          className,
        ].join(' ')}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[11px] text-sc-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[11px] text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
