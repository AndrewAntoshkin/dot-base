import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  convertInchesToTwip,
} from 'docx';
import * as fs from 'fs';

const createBoldText = (text: string, size = 24) =>
  new TextRun({ text, bold: true, size });

const createText = (text: string, size = 24) =>
  new TextRun({ text, size });

const createHeading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) =>
  new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
  });

const createParagraph = (text: string) =>
  new Paragraph({
    children: [createText(text)],
    spacing: { after: 120 },
  });

const createBullet = (text: string) =>
  new Paragraph({
    children: [createText(text)],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });

const tableBorder = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: '999999',
};

const createTableCell = (text: string, isHeader = false) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [
          isHeader ? createBoldText(text, 22) : createText(text, 22),
        ],
      }),
    ],
    margins: {
      top: convertInchesToTwip(0.05),
      bottom: convertInchesToTwip(0.05),
      left: convertInchesToTwip(0.1),
      right: convertInchesToTwip(0.1),
    },
    borders: {
      top: tableBorder,
      bottom: tableBorder,
      left: tableBorder,
      right: tableBorder,
    },
  });

const createTable = (headers: string[], rows: string[][]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map((h) => createTableCell(h, true)),
        tableHeader: true,
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell) => createTableCell(cell)),
          })
      ),
    ],
  });

const doc = new Document({
  creator: 'BASECRAFT',
  title: 'BASECRAFT SLA - Соглашение об уровне сервиса',
  description: 'Service Level Agreement для AI-платформы BASECRAFT',
  sections: [
    {
      properties: {},
      children: [
        // Заголовок
        new Paragraph({
          children: [
            new TextRun({
              text: 'BASECRAFT',
              bold: true,
              size: 56,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Соглашение об уровне сервиса (SLA)',
              bold: true,
              size: 36,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            createText('Версия: 1.0 | Дата: 25 декабря 2025'),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),

        // Раздел 1
        createHeading('1. ОБЩЕЕ ОПИСАНИЕ СЕРВИСА', HeadingLevel.HEADING_1),
        
        createHeading('1.1 Назначение', HeadingLevel.HEADING_2),
        createParagraph(
          'BASECRAFT — масштабируемая AI-платформа для генерации, редактирования, улучшения и обработки изображений и видео с использованием передовых нейросетевых моделей.'
        ),

        createHeading('1.2 Ключевые возможности', HeadingLevel.HEADING_2),
        createTable(
          ['Категория', 'Описание', 'Количество моделей'],
          [
            ['Создание изображений', 'Генерация из текста (Text-to-Image)', '11 моделей'],
            ['Редактирование изображений', 'Изменение существующих изображений', '8 моделей'],
            ['Улучшение качества', 'Увеличение разрешения (Upscale)', '6 моделей'],
            ['Удаление фона', 'Автоматическое удаление фона', '4 модели'],
            ['Создание видео', 'Text-to-Video, Image-to-Video', '15 моделей'],
            ['Редактирование видео', 'Стилизация, рефрейминг, звук', '6 моделей'],
            ['ИТОГО', '', '50+ AI моделей'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('1.3 Технологический стек', HeadingLevel.HEADING_2),
        createTable(
          ['Компонент', 'Технология'],
          [
            ['Frontend', 'Next.js 14 (App Router), TypeScript, React 18'],
            ['Стилизация', 'Tailwind CSS, shadcn/ui'],
            ['Backend', 'Next.js API Routes, REST API'],
            ['База данных', 'Supabase (PostgreSQL)'],
            ['Хранилище', 'Supabase Storage'],
            ['AI-инференс', 'Replicate API (10 токенов в пуле)'],
            ['Хостинг', 'Vercel (Edge Network)'],
            ['CDN', 'Vercel Edge Network, глобальное распределение'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        // Раздел 2
        createHeading('2. ПАРАМЕТРЫ SLA', HeadingLevel.HEADING_1),
        
        createHeading('2.1 Доступность сервиса (Uptime)', HeadingLevel.HEADING_2),
        createTable(
          ['Параметр', 'Гарантия', 'Метод измерения'],
          [
            ['Uptime API', '99.5% в месяц', 'Мониторинг health endpoint'],
            ['Uptime Web-интерфейса', '99.5% в месяц', 'Synthetic monitoring'],
            ['Допустимый простой', 'До 3.6 часов/месяц', 'Плановые + внеплановые'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createParagraph('Исключения из расчета Uptime:'),
        createBullet('Плановые технические работы (уведомление за 24 часа)'),
        createBullet('Форс-мажорные обстоятельства'),
        createBullet('Проблемы на стороне провайдера инференса (Replicate)'),
        createBullet('DDoS-атаки и инциденты безопасности'),

        createHeading('2.2 Время обработки запросов', HeadingLevel.HEADING_2),
        createTable(
          ['Тип операции', 'Среднее время', 'P95', 'Максимум'],
          [
            ['API Health Check', '< 50ms', '< 100ms', '500ms'],
            ['Список генераций', '< 100ms', '< 200ms', '1s'],
            ['Создание генерации', '< 500ms', '< 1s', '5s'],
            ['Загрузка изображения', '< 2s', '< 5s', '30s'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('2.3 Время генерации AI-контента', HeadingLevel.HEADING_2),
        createTable(
          ['Категория', 'Среднее время', 'Диапазон'],
          [
            ['Быстрые модели (FLUX Schnell, SDXL Lightning)', '2-5 сек', '1-10 сек'],
            ['Стандартные модели (FLUX Pro, Imagen 4)', '10-30 сек', '5-60 сек'],
            ['Премиум модели (FLUX 2 Max, 4K генерация)', '30-90 сек', '20-180 сек'],
            ['Видео генерация (5-10 сек видео)', '60-300 сек', '30-600 сек'],
            ['Upscale/Remove BG', '5-15 сек', '2-30 сек'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('2.4 Лимиты и квоты', HeadingLevel.HEADING_2),
        createTable(
          ['Параметр', 'Лимит'],
          [
            ['Параллельные генерации', '10 (пул токенов)'],
            ['Размер загружаемого файла', '10 MB (изображение), 100 MB (видео)'],
            ['Выходное разрешение изображений', 'До 4096×4096 px'],
            ['Длительность видео', 'До 12 секунд (зависит от модели)'],
            ['Форматы входных файлов', 'JPG, PNG, WebP, GIF, MP4, WebM, MOV'],
            ['Форматы выходных файлов', 'PNG, JPG, WebP, MP4'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        // Раздел 3
        createHeading('3. ДОСТУПНЫЕ AI-МОДЕЛИ', HeadingLevel.HEADING_1),

        createHeading('3.1 Создание изображений — 11 моделей', HeadingLevel.HEADING_2),
        createTable(
          ['Модель', 'Провайдер', 'Особенности'],
          [
            ['FLUX 2 Max', 'Black Forest Labs', 'До 8 референсов, макс. качество'],
            ['FLUX Schnell', 'Black Forest Labs', 'Самая быстрая FLUX'],
            ['SDXL Lightning', 'ByteDance', '4 шага, ультра-быстрая'],
            ['Imagen 4', 'Google', 'Лучшее освещение'],
            ['SeeDream 4', 'ByteDance', 'До 4K разрешения'],
            ['Recraft V3', 'Recraft AI', 'Контроль стиля'],
            ['Ideogram V3 Turbo', 'Ideogram AI', 'Быстрая + текст'],
            ['Nano Banana Pro', 'Google', 'Gemini 2.5, до 14 референсов'],
            ['Z-Image Turbo', 'PrunaAI', 'Текст EN/CN, $0.009/img'],
            ['Gen4 Image Turbo', 'Runway', 'До 3 референсов'],
            ['Stable Diffusion', 'Stability AI', 'Классика, negative prompts'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('3.2 Редактирование изображений — 8 моделей', HeadingLevel.HEADING_2),
        createTable(
          ['Модель', 'Тип редактирования'],
          [
            ['Nano Banana Pro', 'Общее редактирование'],
            ['FLUX Kontext Max', 'Премиум редактирование текста'],
            ['SeeDream 4', 'Точное редактирование до 4K'],
            ['Bria Eraser', 'Удаление объектов по маске'],
            ['Bria GenFill', 'Добавление объектов'],
            ['FLUX Kontext Fast', 'Ультрабыстрое редактирование'],
            ['Bria Expand', 'Расширение границ изображения'],
            ['FLUX Fill Pro', 'Inpainting, заполнение'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('3.3 Улучшение качества — 6 моделей', HeadingLevel.HEADING_2),
        createTable(
          ['Модель', 'Масштаб', 'Особенности'],
          [
            ['Real-ESRGAN', '2x, 4x', 'Универсальный, GFPGAN для лиц'],
            ['Clarity Upscaler', '1-4x', 'Портреты, продукты'],
            ['Recraft Crisp Upscale', '2x, 4x', 'Четкость для веб и печати'],
            ['Crystal Upscaler', '2x, 4x', 'Высокоточный для портретов'],
            ['Google Upscaler', '2x, 4x', 'Google качество'],
            ['Magic Image Refiner', '-', 'Улучшение + inpainting'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('3.4 Удаление фона — 4 модели', HeadingLevel.HEADING_2),
        createTable(
          ['Модель', 'Особенности'],
          [
            ['851 Labs Background Remover', 'Быстрое удаление'],
            ['BiRefNet', 'Точная сегментация волос'],
            ['Bria Remove Background', 'E-commerce качество'],
            ['Lucataco Remove BG', 'Простое удаление'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('3.5 Видео Text-to-Video — 7 моделей', HeadingLevel.HEADING_2),
        createTable(
          ['Модель', 'Провайдер', 'Макс. длительность', 'Разрешение'],
          [
            ['Veo 3.1 Fast', 'Google', '8 сек', '720p/1080p'],
            ['Kling v2.5 Turbo Pro', 'Kuaishou', '10 сек', '1080p'],
            ['Hailuo 2.3', 'MiniMax', '10 сек', '768p/1080p'],
            ['Kling v2.1', 'Kuaishou', '10 сек', '1080p'],
            ['Wan 2.5 T2V', 'Alibaba', '10 сек', '720p/1080p'],
            ['Seedance 1 Pro', 'ByteDance', '12 сек', '480p-1080p'],
            ['Hailuo 02', 'MiniMax', '10 сек', '512p-1080p'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('3.6 Видео Image-to-Video — 8 моделей', HeadingLevel.HEADING_2),
        createTable(
          ['Модель', 'Макс. длительность', 'Last Frame поддержка'],
          [
            ['Kling v2.5 Turbo Pro', '10 сек', 'Нет'],
            ['Seedance 1 Pro Fast', '12 сек', 'Да'],
            ['Seedance 1 Pro', '12 сек', 'Да'],
            ['Runway Gen4 Turbo', '10 сек', 'Нет'],
            ['Wan 2.5 I2V Fast', '10 сек', 'Нет'],
            ['Hailuo 2.3 Fast', '6 сек', 'Нет'],
            ['Kling v2.1', '10 сек', 'Да (Pro режим)'],
            ['Hailuo 02', '10 сек', 'Да'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        // Раздел 4
        createHeading('4. ЦЕНООБРАЗОВАНИЕ', HeadingLevel.HEADING_1),

        createHeading('4.1 Формула расчета стоимости', HeadingLevel.HEADING_2),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Стоимость (RUB) = (Время генерации × Цена GPU/сек × 1.5) × 80',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),
        createBullet('Время генерации — реальное время обработки в секундах'),
        createBullet('Цена GPU/сек — зависит от используемого GPU'),
        createBullet('1.5 — коэффициент наценки'),
        createBullet('80 — курс USD/RUB'),

        createHeading('4.2 Стоимость GPU', HeadingLevel.HEADING_2),
        createTable(
          ['GPU', 'Цена за секунду (USD)'],
          [
            ['CPU', '$0.000100'],
            ['Nvidia T4', '$0.000225'],
            ['Nvidia A40 (Small)', '$0.000575'],
            ['Nvidia A40 (Large)', '$0.000725'],
            ['Nvidia L40S', '$0.000975'],
            ['Nvidia A100 (80GB)', '$0.001400'],
            ['Nvidia H100', '$0.001525'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('4.3 Примеры стоимости операций', HeadingLevel.HEADING_2),
        createTable(
          ['Операция', 'Время', 'GPU', 'Стоимость (USD)', 'Стоимость (RUB)'],
          [
            ['FLUX Schnell (1 изображение)', '3 сек', 'A100', '~$0.004', '~0.5₽'],
            ['SDXL Lightning', '2 сек', 'A40', '~$0.001', '~0.15₽'],
            ['Real-ESRGAN 4x', '5 сек', 'T4', '~$0.001', '~0.13₽'],
            ['Удаление фона', '2 сек', 'T4', '~$0.0005', '~0.05₽'],
            ['Видео 10 сек (Kling)', '120 сек', 'H100', '~$0.18', '~22₽'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        // Раздел 5
        createHeading('5. API ДОКУМЕНТАЦИЯ', HeadingLevel.HEADING_1),

        createHeading('5.1 Базовый URL', HeadingLevel.HEADING_2),
        new Paragraph({
          children: [
            new TextRun({
              text: 'https://basecraft.app/api',
              font: 'Courier New',
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        createHeading('5.2 Основные эндпоинты', HeadingLevel.HEADING_2),
        createTable(
          ['Эндпоинт', 'Метод', 'Описание'],
          [
            ['/api/generations/create', 'POST', 'Создать генерацию'],
            ['/api/generations/{id}', 'GET', 'Получить статус генерации'],
            ['/api/generations/list', 'GET', 'Список генераций пользователя'],
            ['/api/models/list', 'GET', 'Список доступных моделей'],
            ['/api/upload', 'POST', 'Загрузить файл'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('5.3 Статусы генераций', HeadingLevel.HEADING_2),
        createTable(
          ['Статус', 'Описание'],
          [
            ['pending', 'В очереди на обработку'],
            ['processing', 'Обрабатывается моделью'],
            ['completed', 'Успешно завершено'],
            ['failed', 'Ошибка обработки'],
            ['cancelled', 'Отменено пользователем'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        // Раздел 6
        createHeading('6. БЕЗОПАСНОСТЬ', HeadingLevel.HEADING_1),

        createHeading('6.1 Защита данных', HeadingLevel.HEADING_2),
        createTable(
          ['Аспект', 'Реализация'],
          [
            ['Шифрование', 'TLS 1.3 для всех соединений'],
            ['Аутентификация', 'Supabase Auth (JWT токены)'],
            ['Авторизация', 'Row Level Security (RLS) в PostgreSQL'],
            ['Хранение файлов', 'Приватные бакеты Supabase Storage'],
            ['Логирование', 'Полное логирование всех API запросов'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('6.2 Политика хранения данных', HeadingLevel.HEADING_2),
        createTable(
          ['Тип данных', 'Срок хранения'],
          [
            ['Метаданные генераций', 'Бессрочно'],
            ['Выходные изображения/видео', '90 дней'],
            ['Входные файлы', '24 часа'],
            ['Логи API', '30 дней'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        // Раздел 7
        createHeading('7. ПОДДЕРЖКА', HeadingLevel.HEADING_1),

        createHeading('7.1 Уровни поддержки', HeadingLevel.HEADING_2),
        createTable(
          ['Уровень', 'Время реакции', 'Время решения', 'Каналы'],
          [
            ['Критический (сервис недоступен)', '1 час', '4 часа', 'Email, Telegram'],
            ['Высокий (функционал не работает)', '4 часа', '24 часа', 'Email, Telegram'],
            ['Средний (проблемы с качеством)', '24 часа', '72 часа', 'Email'],
            ['Низкий (вопросы, пожелания)', '48 часов', '5 дней', 'Email'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('7.2 Контакты', HeadingLevel.HEADING_2),
        createBullet('Email: andrew.antoshkin@gmail.com'),
        createBullet('Telegram: @basecraft_support'),
        createBullet('Часы работы: 10:00 - 22:00 MSK (пн-пт)'),
        createBullet('Критические инциденты: 24/7'),

        // Раздел 8
        createHeading('8. ШТРАФЫ ЗА НАРУШЕНИЕ SLA', HeadingLevel.HEADING_1),

        createHeading('8.1 Компенсации при недоступности', HeadingLevel.HEADING_2),
        createTable(
          ['Uptime за месяц', 'Компенсация'],
          [
            ['99.0% - 99.5%', '10% от месячной оплаты'],
            ['98.0% - 99.0%', '25% от месячной оплаты'],
            ['95.0% - 98.0%', '50% от месячной оплаты'],
            ['< 95.0%', '100% от месячной оплаты'],
          ]
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        createHeading('8.2 Условия получения компенсации', HeadingLevel.HEADING_2),
        createBullet('Подать заявку в течение 14 дней после окончания месяца'),
        createBullet('Предоставить доказательства недоступности (если есть)'),
        createBullet('Компенсация не выплачивается при плановых работах, проблемах на стороне пользователя, форс-мажоре'),

        // Подпись
        new Paragraph({ text: '', spacing: { after: 400 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: '────────────────────────────────────────',
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'BASECRAFT © 2025. Все права защищены.',
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          children: [
            createText('Документ сгенерирован: 25 декабря 2025'),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    },
  ],
});

// Generate and save
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('docs/BASECRAFT_SLA.docx', buffer);
  console.log('✅ Документ создан: docs/BASECRAFT_SLA.docx');
});

