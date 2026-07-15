import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'secondary';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

const variantStyles: Record<Variant, string> = {
  primary: 'bg-sc-amber text-sc-base font-semibold shadow-[0_8px_18px_rgba(201,135,54,0.16)] hover:bg-sc-amber-h active:bg-sc-amber-d',
  ghost: 'border border-sc-border text-sc-sub bg-transparent hover:bg-sc-raised hover:text-sc-text',
  danger: 'bg-sc-red text-sc-base font-semibold hover:bg-red-400',
  secondary: 'bg-sc-raised text-sc-text border border-sc-border hover:border-sc-border2 hover:bg-[#292b30]',
};

const sizeStyles: Record<Size, string> = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-sm' };

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={['inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-amber focus-visible:ring-offset-2 focus-visible:ring-offset-sc-base', sizeStyles[size], variantStyles[variant], className].join(' ')}
    >
      {children}
    </button>
  );
}
