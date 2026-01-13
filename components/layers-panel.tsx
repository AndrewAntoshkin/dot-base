'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Pencil, Trash2, RefreshCw, Download, Loader2 } from 'lucide-react';

export interface Layer {
  id: string;
  name: string;
  mask_url: string;
  preview_url: string;
  z_index: number;
  is_visible?: boolean;
}

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onBack: () => void;
  onEditLayer: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onRegenerateLayer: (layerId: string) => void;
  onExport: () => void;
  isProcessing?: boolean;
}

// Названия слоёв на русском
function getLayerDisplayName(layer: Layer, index: number): string {
  if (layer.name === 'background') return 'Фон';
  return `Объект ${index}`;
}

export function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onBack,
  onEditLayer,
  onDeleteLayer,
  onRegenerateLayer,
  onExport,
  isProcessing = false,
}: LayersPanelProps) {
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="flex flex-col h-full">
      {/* Header с кнопкой назад */}
      <div className="mb-6 shrink-0 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-[#1f1f1f] transition-colors"
            title="Назад"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
            LAYERS
          </h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Список слоёв */}
        <div className="flex flex-col gap-2 animate-fade-in-up animate-delay-100">
          {layers.length === 0 ? (
            <div className="border border-[#252525] rounded-[16px] p-4">
              <p className="font-inter text-sm text-[#656565] text-center">
                Слои не найдены
              </p>
            </div>
          ) : (
            layers.map((layer, index) => (
              <button
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`
                  flex items-center gap-3 p-3
                  border rounded-[12px] transition-all
                  ${selectedLayerId === layer.id 
                    ? 'border-white bg-[#1f1f1f]' 
                    : 'border-[#252525] hover:border-[#3f3f3f] hover:bg-[#151515]'
                  }
                `}
              >
                {/* Visibility toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                  }}
                  className="p-1 rounded hover:bg-[#2f2f2f] transition-colors"
                  title={layer.is_visible !== false ? 'Скрыть слой' : 'Показать слой'}
                >
                  {layer.is_visible !== false ? (
                    <Eye className="w-4 h-4 text-white" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-[#656565]" />
                  )}
                </button>

                {/* Preview thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#0a0a0a] shrink-0">
                  <img
                    src={layer.preview_url}
                    alt={layer.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Layer name */}
                <span className={`
                  font-inter text-sm flex-1 text-left
                  ${layer.is_visible !== false ? 'text-white' : 'text-[#656565]'}
                `}>
                  {getLayerDisplayName(layer, index)}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Действия со слоем */}
        {selectedLayer && (
          <div className="mt-6 animate-fade-in-up animate-delay-200">
            <div className="border border-[#252525] rounded-[16px] p-4">
              <p className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px] mb-3">
                Действия со слоем
              </p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onEditLayer(selectedLayer.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 w-full p-3 rounded-xl border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Pencil className="w-4 h-4" />
                  )}
                  <span className="font-inter text-sm">Редактировать</span>
                </button>

                <button
                  onClick={() => onDeleteLayer(selectedLayer.id)}
                  disabled={isProcessing || selectedLayer.name === 'background'}
                  className="flex items-center gap-2 w-full p-3 rounded-xl border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span className="font-inter text-sm">Удалить объект</span>
                </button>

                <button
                  onClick={() => onRegenerateLayer(selectedLayer.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 w-full p-3 rounded-xl border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="font-inter text-sm">Заменить</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Кнопка экспорта внизу */}
      <div className="shrink-0 pt-4 border-t border-[#1f1f1f] mt-4">
        <button
          onClick={onExport}
          disabled={layers.length === 0}
          className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-white text-black font-inter font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
        >
          <Download className="w-4 h-4" />
          <span>Экспорт PNG</span>
        </button>
      </div>
    </div>
  );
}

