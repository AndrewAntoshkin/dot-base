import { ReactNode } from 'react';

interface FormFieldCardProps {
  label: string;
  children: ReactNode;
  description?: string;
  defaultValue?: string;
  className?: string;
}

/**
 * Form field wrapper card component
 * Provides consistent card styling for form fields per Figma design
 * - bg-[#1a1a1a] background
 * - 16px padding
 * - 16px rounded corners
 * - Small uppercase label
 */
export function FormFieldCard({
  label, 
  children, 
  description, 
  defaultValue,
  className = '' 
}: FormFieldCardProps) {
  return (
    <div className={`bg-[#1a1a1a] rounded-[16px] p-4 flex flex-col gap-2 ${className}`}>
      {/* Label - 10px uppercase with tracking */}
      <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
        {label}
      </label>
      
      {/* Field content */}
      {children}
      
      {/* Description and default value */}
      {(description || defaultValue) && (
        <div className="flex flex-col gap-1.5">
          {description && (
            <p className="font-inter text-[14px] leading-[20px] text-[#959595]">
              {description}
            </p>
          )}
          {defaultValue && (
            <p className="font-inter font-medium text-[12px] leading-[16px] text-[#e0e0e0]">
              По умолчанию {defaultValue}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

