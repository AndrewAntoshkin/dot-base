'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function ReveEditPage() {
  return (
    <ModelPageTemplate
      name="Reve Edit"
      familyName="Reve"
      familyHref="/docs/models/edit"
      shortDescription="Редактирование изображений от Reve. Изменение по текстовой инструкции."
      description={`Reve Edit — модель для редактирования изображений по текстовым инструкциям. Опишите что нужно изменить, и модель применит изменения.

Не требует маски — просто опишите изменение словами. Модель сама определит что и как изменить.

Удобно для быстрых правок без сложного workflow с масками.`}
      specs={[
        { label: 'Тип', value: 'Instruction-based Editing' },
        { label: 'Маска', value: 'Не требуется' },
        { label: 'Время обработки', value: '5-15 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Длина инструкции', value: 'До 500 символов' },
      ]}
      promptExamples={[
        {
          title: 'Смена цвета',
          prompt: 'Change the car color from red to blue',
        },
        {
          title: 'Добавление',
          prompt: 'Add sunglasses to the person',
        },
        {
          title: 'Стиль',
          prompt: 'Make it look like a watercolor painting',
        },
      ]}
      details={`Reve Edit понимает инструкции на английском языке. Описывайте изменения чётко и конкретно.

Хорошо справляется с:
- Изменением цветов и материалов
- Добавлением аксессуаров
- Стилизацией
- Изменением времени суток/погоды

Для точечных изменений с полным контролем используйте модели с масками (Bria GenFill).`}
      idealFor={[
        'Быстрые правки без масок',
        'Изменение цветов',
        'Стилизация',
        'Добавление элементов',
        'Эксперименты с вариациями',
      ]}
      tip="Пишите инструкции как команды: 'Change X to Y', 'Add X', 'Remove X'."
      actionHref="/inpaint"
    />
  );
}

