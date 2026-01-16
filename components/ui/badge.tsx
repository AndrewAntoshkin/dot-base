'use client';

import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
}

const variantStyles = {
  default: 'bg-[#2f2f2f] text-white',
  success: 'bg-green-500/20 text-green-400 border border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border border-red-500/30',
  outline: 'bg-transparent border border-[#3f3f3f] text-[#959595]',
};

export function Badge({ 
  className = '', 
  variant = 'default',
  children,
  ...props 
}: BadgeProps) {
  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-inter ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}



















