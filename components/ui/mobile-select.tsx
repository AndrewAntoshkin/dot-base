'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// SVG иконки из Figma дизайна
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 1L1 13M1 1L13 13" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export interface SelectOption {
  value: string;
  label: string;
  badge?: {
    text: string;
    icon?: React.ReactNode;
    className?: string;
  };
}

interface MobileSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  title?: string;
  className?: string;
  triggerClassName?: string;
}

export function MobileSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Выбрать из списка',
  title = 'Выбор',
  className,
  triggerClassName,
}: MobileSelectProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = React.useState(false);
  const [tempValue, setTempValue] = React.useState(value);

  // Определяем мобильное устройство
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Синхронизируем временное значение при открытии
  React.useEffect(() => {
    if (bottomSheetOpen) {
      setTempValue(value);
    }
  }, [bottomSheetOpen, value]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleConfirm = () => {
    if (tempValue) {
      onValueChange(tempValue);
    }
    setBottomSheetOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setBottomSheetOpen(false);
  };

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setBottomSheetOpen(true)}
          className={cn(
            'flex h-12 w-full items-center justify-between rounded-[8px] bg-[#101010] px-3 py-[10px] font-inter font-normal text-[14px] text-white',
            triggerClassName
          )}
        >
          <span className={!selectedOption ? 'text-[#959595]' : ''}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-5 w-5 text-white" />
        </button>

        {/* Bottom Sheet */}
        <Dialog.Root open={bottomSheetOpen} onOpenChange={setBottomSheetOpen}>
          <Dialog.Portal>
            {/* Overlay */}
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            
            {/* Content */}
            <Dialog.Content
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#131313] rounded-t-[16px] overflow-hidden flex flex-col max-h-[80vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 opacity-90">
                <Dialog.Title className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                  {title}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-7 h-7 rounded-[8.75px] bg-white flex items-center justify-center"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Options list - со скроллом */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="flex flex-col gap-2">
                  {options.map((option) => {
                    const isSelected = tempValue === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTempValue(option.value)}
                        className={cn(
                          'w-full h-12 rounded-[12px] px-4 py-2 flex items-center gap-3 transition-colors text-left',
                          'bg-[#232323]',
                          isSelected && 'border border-[#d6d6d6]'
                        )}
                      >
                        {/* Галочка только у выбранного */}
                        {isSelected && (
                          <div className="shrink-0">
                            <CheckIcon />
                          </div>
                        )}
                        
                        {/* Текст */}
                        <span className="flex-1 font-inter font-normal text-[14px] leading-[18px] text-white">
                          {option.label}
                        </span>
                        
                        {/* Badge */}
                        {option.badge && (
                          <span className={cn(
                            'px-2 py-1 rounded-[6px] flex items-center gap-1 font-inter font-bold text-[14px] leading-[18px] text-white',
                            option.badge.className || 'bg-[#573417]'
                          )}>
                            {option.badge.text}
                            {option.badge.icon}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#131313] p-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 h-11 rounded-[12px] border border-[#4d4d4d] font-inter font-medium text-[14px] text-white"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 h-11 rounded-[12px] bg-white font-inter font-medium text-[14px] text-black"
                >
                  Выбрать
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </>
    );
  }

  // Desktop: стилизованный Radix Select по дизайну Figma
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-[8px] bg-[#101010] px-3 py-[10px] font-inter font-normal text-[14px] text-white placeholder:text-[#959595] focus:outline-none focus:border focus:border-white transition-colors',
          triggerClassName
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-5 w-5 text-white" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 overflow-hidden rounded-[16px] bg-[#131313] p-2 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          position="popper"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="flex flex-col gap-2 w-full min-w-[var(--radix-select-trigger-width)] max-h-[300px]">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-[12px] h-12 px-4 py-2 outline-none transition-colors',
                  'bg-[#232323] hover:bg-[#2a2a2a]',
                  'data-[state=checked]:border data-[state=checked]:border-[#d6d6d6]',
                  'font-inter text-[14px] text-white'
                )}
              >
                {/* Галочка для выбранного элемента */}
                <span className="shrink-0 mr-3 data-[state=unchecked]:hidden">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                </span>
                
                <SelectPrimitive.ItemText className="flex-1">
                  {option.label}
                </SelectPrimitive.ItemText>
                
                {/* Badge */}
                {option.badge && (
                  <span className={cn(
                    'ml-2 px-2 py-1 rounded-[6px] flex items-center gap-1 font-inter font-bold text-[14px] leading-[18px] text-white',
                    option.badge.className || 'bg-[#573417]'
                  )}>
                    {option.badge.text}
                    {option.badge.icon}
                  </span>
                )}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
