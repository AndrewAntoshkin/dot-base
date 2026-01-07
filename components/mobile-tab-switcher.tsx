'use client';

interface MobileTabSwitcherProps {
  activeTab: 'input' | 'output';
  onTabChange: (tab: 'input' | 'output') => void;
  label?: string;
}

export function MobileTabSwitcher({ activeTab, onTabChange, label = 'IMAGE GENERATION' }: MobileTabSwitcherProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label */}
      <p className="font-inter font-medium text-[10px] leading-[14px] text-[#696969] uppercase tracking-[0.2px]">
        {label}
      </p>
      
      {/* Tab Switcher */}
      <div className="bg-[#131313] flex gap-1 p-[2px] rounded-[16px] w-full">
        <button
          onClick={() => onTabChange('input')}
          className={`
            flex-1 h-9 flex items-center justify-center rounded-[12px] 
            font-inter font-medium text-[12px] uppercase tracking-[0.24px]
            transition-colors
            ${activeTab === 'input' 
              ? 'bg-[#1f1f1f] text-white' 
              : 'text-[#959595] hover:text-white'
            }
          `}
        >
          Input
        </button>
        <button
          onClick={() => onTabChange('output')}
          className={`
            flex-1 h-9 flex items-center justify-center rounded-[12px]
            font-inter font-medium text-[12px] uppercase tracking-[0.24px]
            transition-colors
            ${activeTab === 'output' 
              ? 'bg-[#1f1f1f] text-white' 
              : 'text-[#959595] hover:text-white'
            }
          `}
        >
          Output
        </button>
      </div>
    </div>
  );
}



















