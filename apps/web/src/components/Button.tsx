import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-sc-amber text-sc-base font-semibold hover:bg-sc-amber-h active:bg-sc-amber-d active:scale-[0.98]',
  ghost:
    'border border-sc-border2 text-sc-sub bg-transparent hover:bg-sc-raised hover:text-sc-text active:scale-[0.98]',
  danger:
    'bg-sc-red text-white font-semibold hover:bg-red-700 active:scale-[0.98]',
  secondary:
    'bg-sc-raised text-sc-text border border-sc-border hover:bg-sc-border active:scale-[0.98]',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2',
        sizeStyles[size],
        'rounded-md',
        'transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-amber focus-visible:ring-offset-2 focus-visible:ring-offset-sc-base',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
