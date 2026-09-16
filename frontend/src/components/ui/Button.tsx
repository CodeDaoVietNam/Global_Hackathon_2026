import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'coral' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5'
  };

  const variantStyles = {
    primary:
      'bg-[#0f766e] hover:bg-[#0d9488] text-white shadow-xs focus:ring-[#0f766e] active:bg-[#115e59]',
    secondary:
      'bg-[#f0fdfa] text-[#0f766e] border border-[#ccfbf1] hover:bg-[#ccfbf1] focus:ring-[#0f766e]',
    outline:
      'bg-white text-[#1e293b] border border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1] focus:ring-[#0f766e]',
    ghost:
      'bg-transparent text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] focus:ring-[#0f766e]',
    coral:
      'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3] hover:bg-[#ffe4e6] focus:ring-[#e11d48]',
    subtle:
      'bg-[#f8f7f4] text-[#334155] hover:bg-[#f1efe9] border border-[#e7e5e0] focus:ring-[#0f766e]'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
