// LoRA Training Models Configuration

export interface LoraTrainer {
  id: string;
  name: string;
  displayName: string;
  replicateModel: string;
  version: string;
  description: string;
  trainingTime: string; // Estimated time
  recommended: boolean;
  features: string[];
  minImages: number;
  maxImages: number;
  supportsCaption: boolean;
}

export const LORA_TRAINERS: LoraTrainer[] = [
  {
    id: 'fast-flux-trainer',
    name: 'Fast Flux Trainer',
    displayName: '⚡ Fast Flux Trainer',
    replicateModel: 'replicate/fast-flux-trainer',
    version: '8b10794665aed907bb98a1a5324cd1d3a8bea0e9b31e65210967fb9c9e2e08ed',
    description: 'Самая быстрая модель обучения. Идеально для быстрых тестов и простых LoRA.',
    trainingTime: '3-5 мин',
    recommended: true,
    features: ['Быстрое обучение', 'Автоматические captions', 'Subject & Style'],
    minImages: 5,
    maxImages: 50,
    supportsCaption: true,
  },
  {
    id: 'ostris-flux-trainer',
    name: 'Ostris Flux Dev LoRA Trainer',
    displayName: '🎯 Ostris Flux Trainer',
    replicateModel: 'ostris/flux-dev-lora-trainer',
    version: 'd995297071a44dcb72244e6c19462111649ec86a9ff7e6b8a60e01e4f14c634c',
    description: 'Продвинутая модель с детальной настройкой. Лучше для сложных объектов и стилей.',
    trainingTime: '10-15 мин',
    recommended: false,
    features: ['Детальная настройка', 'Лучшее качество', 'Больше контроля'],
    minImages: 10,
    maxImages: 100,
    supportsCaption: true,
  },
  {
    id: 'lucataco-flux-trainer',
    name: 'Lucataco Flux Dev LoRA Trainer',
    displayName: '🔬 Lucataco Trainer',
    replicateModel: 'lucataco/flux-dev-lora-trainer',
    version: '1fc5c5dc8bfa10f3ab04e9e44b7a9a1659b7e4e9c30fe9c5d43a5b9e8ddf2a17',
    description: 'Альтернативная версия с оптимизацией для конкретных случаев.',
    trainingTime: '8-12 мин',
    recommended: false,
    features: ['Оптимизированная память', 'Стабильные результаты'],
    minImages: 8,
    maxImages: 80,
    supportsCaption: true,
  },
];

export function getTrainerById(id: string): LoraTrainer | undefined {
  return LORA_TRAINERS.find(t => t.id === id);
}

export function getRecommendedTrainer(): LoraTrainer {
  return LORA_TRAINERS.find(t => t.recommended) || LORA_TRAINERS[0];
}

// LoRA Types for training
export interface LoraType {
  id: string;
  label: string;
  description: string;
  replicateType: 'style' | 'subject';
  icon: string;
}

export const LORA_TYPES: LoraType[] = [
  {
    id: 'product',
    label: 'Объект',
    description: 'Бутылка, машина, предмет',
    replicateType: 'subject',
    icon: '📦',
  },
  {
    id: 'character',
    label: 'Персонаж',
    description: 'Лицо, человек, персонаж',
    replicateType: 'subject',
    icon: '👤',
  },
  {
    id: 'style',
    label: 'Стиль',
    description: 'Художественный стиль',
    replicateType: 'style',
    icon: '🎨',
  },
  {
    id: 'custom',
    label: 'Другое',
    description: 'Свой вариант',
    replicateType: 'subject',
    icon: '✨',
  },
];

export function getLoraTypeById(id: string): LoraType | undefined {
  return LORA_TYPES.find(t => t.id === id);
}

