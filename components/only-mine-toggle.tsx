'use client';

interface OnlyMineToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function OnlyMineToggle({ checked, onChange, disabled }: OnlyMineToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-[10px] transition-colors
        ${checked 
          ? 'bg-[#2c2c2c] border border-[#2f2f2f]' 
          : 'bg-[#2c2c2c] border border-[#2f2f2f]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#333333]'}
      `}
    >
      <span className="font-inter font-medium text-[14px] text-white leading-[20px]">
        Только мои
      </span>
      
      {/* Toggle switch */}
      <div 
        className={`
          relative w-[36px] h-[20px] rounded-full transition-colors
          ${checked ? 'bg-white' : 'bg-[#4a4a4a]'}
        `}
      >
        <div 
          className={`
            absolute top-[2px] w-[16px] h-[16px] rounded-full transition-all
            ${checked 
              ? 'left-[18px] bg-black' 
              : 'left-[2px] bg-[#8c8c8c]'
            }
          `}
        />
      </div>
    </button>
  );
}
