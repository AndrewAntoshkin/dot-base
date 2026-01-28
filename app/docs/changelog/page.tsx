'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsFooter } from '@/components/docs/docs-shell';

const CHANGELOG = [
  {
    version: '0.2.6',
    date: '2026-01-29',
    title: 'Поддержка и уведомления',
    changes: [
      { type: 'new', text: 'Кнопка поддержки — плавающая кнопка в правом нижнем углу на всех страницах' },
      { type: 'new', text: 'Форма обращения — выбор темы, описание проблемы, прикрепление до 5 скриншотов' },
      { type: 'new', text: 'Центр уведомлений — кнопка в хедере с индикатором непрочитанных' },
      { type: 'new', text: 'Сайдбар уведомлений — полная история с группировкой по датам' },
      { type: 'new', text: 'Мгновенные уведомления — ответы от поддержки приходят в реальном времени' },
    ],
  },
  {
    version: '0.2.5',
    date: '2026-01-27',
    title: 'Комментарии в Flow',
    changes: [
      { type: 'new', text: 'Комментарии к нодам — обсуждение конкретных блоков пайплайна' },
      { type: 'new', text: 'Позиционирование — комментарии привязаны к координатам на канвасе' },
      { type: 'new', text: 'Статусы — отметка комментариев как решённых' },
      { type: 'new', text: 'Drag-and-drop референсов — перетаскивание изображений в ноды' },
    ],
  },
  {
    version: '0.2.4',
    date: '2026-01-13',
    title: 'AI Ассистент: История чатов и улучшения',
    changes: [
      { type: 'new', text: 'История диалогов с ассистентом — все чаты сохраняются автоматически' },
      { type: 'new', text: 'Избранные чаты — добавляйте важные диалоги в избранное' },
      { type: 'new', text: 'Группировка чатов по месяцам для удобной навигации' },
      { type: 'improvement', text: 'Улучшено отображение прикреплённых изображений и видео в чате' },
      { type: 'improvement', text: 'Добавлена панель "На этой странице" с навигацией по разделам' },
    ],
  },
  {
    version: '0.2.3',
    date: '2025-12-27',
    title: 'Kling: Motion Control + Edit Video',
    changes: [
      { type: 'new', text: 'Kling 2.6 Motion Control Pro — перенос движений на изображение персонажа' },
      { type: 'new', text: 'Kling O1 Edit Pro — редактирование видео текстовыми инструкциями' },
      { type: 'improvement', text: 'Поддержка @Element и @Image синтаксиса для замены персонажей' },
    ],
  },
  {
    version: '0.2.2',
    date: '2025-12-26',
    title: 'Kling: Text-to-Video, Image-to-Video, Video-to-Video',
    changes: [
      { type: 'new', text: 'Мультипровайдерная архитектура — расширенная поддержка моделей' },
      { type: 'new', text: 'Kling 1.0 T2V в разделе Video → Создать' },
      { type: 'new', text: 'Kling 1.0 I2V с поддержкой первого и последнего кадра' },
      { type: 'new', text: 'Kling O1 V2V для генерации на основе видео-референса' },
      { type: 'improvement', text: 'Улучшена стабильность обработки видео' },
    ],
  },
  {
    version: '0.2.1',
    date: '2025-12-26',
    title: 'Seedance 1.5 Pro и улучшения Brainstorm',
    changes: [
      { type: 'new', text: 'Добавлена модель Seedance 1.5 Pro с синхронизированным аудио и lip-sync' },
      { type: 'new', text: 'Seedance 1.5 Pro доступна в разделах Video → Создать и Video → Картинка → Видео' },
      { type: 'improvement', text: 'Добавлен лимит на 5 моделей в Brainstorm для стабильной работы' },
      { type: 'improvement', text: 'Улучшен интерфейс выбора моделей в Brainstorm' },
    ],
  },
  {
    version: '0.2.0',
    date: '2025-12-24',
    title: 'Документация и новые модели',
    changes: [
      { type: 'new', text: 'Добавлена полная документация платформы' },
      { type: 'new', text: 'Добавлены модели Veo 3.1 Fast и Imagen 4 Ultra от Google' },
      { type: 'new', text: 'Новая модель Hailuo 2.3 с улучшенным качеством' },
      { type: 'new', text: 'Добавлен SeeDream 4.5 с поддержкой редактирования' },
      { type: 'improvement', text: 'Улучшена навигация в документации' },
      { type: 'improvement', text: 'Обновлён интерфейс выбора моделей' },
    ],
  },
  {
    version: '0.1.5',
    date: '2025-12-15',
    title: 'Keyframes и улучшения видео',
    changes: [
      { type: 'new', text: 'Добавлена функция Keyframes для создания видео по частям' },
      { type: 'new', text: 'Поддержка склейки сегментов в единое видео' },
      { type: 'improvement', text: 'Улучшена стабильность генерации видео' },
      { type: 'improvement', text: 'Оптимизирована очередь генераций' },
      { type: 'fix', text: 'Исправлена ошибка загрузки больших файлов' },
    ],
  },
  {
    version: '0.1.4',
    date: '2025-12-01',
    title: 'FLUX Kontext и редактирование',
    changes: [
      { type: 'new', text: 'Добавлены модели FLUX Kontext Max и Fast для редактирования' },
      { type: 'new', text: 'Функция Edit для изменения изображений по описанию' },
      { type: 'improvement', text: 'Улучшен интерфейс Inpaint с новыми инструментами маски' },
      { type: 'fix', text: 'Исправлены проблемы с отображением истории' },
    ],
  },
  {
    version: '0.1.3',
    date: '2025-11-20',
    title: 'Видеогенерация',
    changes: [
      { type: 'new', text: 'Запущена функция Video с поддержкой Kling 2.5 PRO' },
      { type: 'new', text: 'Добавлена модель Hailuo 02' },
      { type: 'new', text: 'Image-to-Video режим для оживления изображений' },
      { type: 'improvement', text: 'Улучшена система очередей для долгих генераций' },
    ],
  },
  {
    version: '0.1.2',
    date: '2025-11-10',
    title: 'Inpaint и Outpaint',
    changes: [
      { type: 'new', text: 'Добавлена функция Inpaint с Bria GenFill' },
      { type: 'new', text: 'Добавлена функция Outpaint с Bria Expand' },
      { type: 'new', text: 'Интеграция FLUX Fill Pro' },
      { type: 'improvement', text: 'Улучшен редактор масок' },
    ],
  },
  {
    version: '0.1.1',
    date: '2025-11-01',
    title: 'Апскейл и удаление фона',
    changes: [
      { type: 'new', text: 'Добавлены апскейлеры: Clarity, Real-ESRGAN, Crystal' },
      { type: 'new', text: 'Функция Remove BG с Bria Remove BG и BiRefNet' },
      { type: 'improvement', text: 'Пакетная обработка изображений' },
      { type: 'fix', text: 'Исправлены ошибки загрузки изображений' },
    ],
  },
  {
    version: '0.1.0',
    date: '2025-10-15',
    title: 'Начальный релиз',
    changes: [
      { type: 'new', text: 'Запуск платформы BASECRAFT!' },
      { type: 'new', text: 'Функция Image с моделями FLUX, SeeDream, Ideogram, Recraft' },
      { type: 'new', text: 'Функция Analyze для анализа изображений' },
      { type: 'new', text: 'Функция Brainstorm для генерации идей' },
      { type: 'new', text: 'Система воркспейсов и пользователей' },
    ],
  },
];

const getChangeLabel = (type: string) => {
  switch (type) {
    case 'new':
      return 'Новое';
    case 'improvement':
      return 'Улучшение';
    case 'fix':
      return 'Исправление';
    default:
      return 'Изменение';
  }
};

// Генерируем ToC из версий
const TABLE_OF_CONTENTS = CHANGELOG.map(release => ({
  id: `v${release.version.replace(/\./g, '-')}`,
  title: `v${release.version}`,
  level: 2,
}));

export default function ChangelogPage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'Changelog' },
      ]} />
      
      <DocsTitle description="История изменений платформы BASECRAFT! Новые функции, улучшения и исправления.">
        Changelog
      </DocsTitle>

      {/* Timeline */}
      <DocsSection title="История версий">
        <div className="space-y-6">
          {CHANGELOG.map((release, index) => (
            <div 
              key={release.version}
              id={`v${release.version.replace(/\./g, '-')}`}
              className="relative pl-6 border-l-2 border-[#2f2f2f]"
            >
              {/* Timeline dot */}
              <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${index === 0 ? 'bg-white' : 'bg-[#404040]'} border-2 border-[#101010]`} />
              
              <div className="p-5 bg-transparent rounded-xl border border-[#2f2f2f]">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-1 border border-[#333] rounded-xl text-sm font-medium text-white font-mono">
                    v{release.version}
                  </span>
                  <span className="text-sm text-[#959595] font-inter">
                    {new Date(release.date).toLocaleDateString('ru-RU', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                
                <h3 className="text-base font-medium text-white font-inter mb-4">
                  {release.title}
                </h3>

                {/* Changes */}
                <div className="space-y-2">
                  {release.changes.map((change, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-inter font-medium border border-[#333] text-white">
                        {getChangeLabel(change.type)}
                      </span>
                      <span className="text-sm text-[#959595] font-inter">
                        {change.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}
