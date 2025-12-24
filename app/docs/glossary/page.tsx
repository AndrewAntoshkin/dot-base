'use client';

import { useState, useMemo } from 'react';
import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import { Search } from 'lucide-react';

// Глоссарий терминов AI-генерации
const GLOSSARY_TERMS = [
  {
    term: 'Aspect Ratio',
    definition: 'Соотношение сторон изображения или видео. Например, 16:9 — широкоформатное горизонтальное, 9:16 — вертикальное для мобильных устройств, 1:1 — квадратное.',
    category: 'Параметры'
  },
  {
    term: 'Batch Size',
    definition: 'Количество изображений, генерируемых за один запрос. Больший batch size экономит время при генерации нескольких вариантов, но требует больше ресурсов.',
    category: 'Параметры'
  },
  {
    term: 'CFG Scale (Guidance Scale)',
    definition: 'Параметр, контролирующий насколько строго модель следует текстовому промпту. Низкие значения (1-5) дают более творческие результаты, высокие (7-15) — более точное следование описанию.',
    category: 'Параметры'
  },
  {
    term: 'Checkpoint',
    definition: 'Сохранённое состояние обученной нейросети. Разные checkpoint могут давать разные стили изображений, хотя основаны на одной архитектуре.',
    category: 'Архитектура'
  },
  {
    term: 'Denoising',
    definition: 'Процесс удаления шума из изображения. В диффузионных моделях — ключевой этап генерации, когда модель постепенно превращает случайный шум в осмысленное изображение.',
    category: 'Архитектура'
  },
  {
    term: 'Diffusion Model',
    definition: 'Тип генеративной модели, которая обучается создавать изображения путём обратного процесса диффузии — постепенного удаления шума из случайного изображения.',
    category: 'Архитектура'
  },
  {
    term: 'DiT (Diffusion Transformer)',
    definition: 'Архитектура, объединяющая принципы диффузии с трансформерами. Используется в современных моделях типа FLUX и Kling для улучшенного качества генерации.',
    category: 'Архитектура'
  },
  {
    term: 'Embeddings',
    definition: 'Числовое представление текста или изображения в виде вектора. Модели используют embeddings для понимания семантического значения промптов.',
    category: 'Архитектура'
  },
  {
    term: 'FPS (Frames Per Second)',
    definition: 'Частота кадров видео. Стандартные значения: 24 fps (кинематограф), 30 fps (телевидение), 60 fps (плавное движение).',
    category: 'Видео'
  },
  {
    term: 'I2V (Image-to-Video)',
    definition: 'Режим генерации видео, при котором входным данным является статичное изображение. Модель анимирует изображение, добавляя движение на основе промпта.',
    category: 'Видео'
  },
  {
    term: 'Image-to-Image (I2I)',
    definition: 'Режим генерации, при котором на вход подаётся исходное изображение, которое модель модифицирует согласно промпту. Используется для редактирования и стилизации.',
    category: 'Режимы'
  },
  {
    term: 'Inference',
    definition: 'Процесс использования обученной модели для генерации новых изображений или видео. В отличие от обучения (training), не изменяет веса модели.',
    category: 'Архитектура'
  },
  {
    term: 'Inference Steps',
    definition: 'Количество шагов деноизинга при генерации. Больше шагов — выше качество и детализация, но дольше генерация. Типичные значения: 20-50.',
    category: 'Параметры'
  },
  {
    term: 'Inpainting',
    definition: 'Техника редактирования, при которой часть изображения (обозначенная маской) заменяется новым содержимым согласно промпту. Остальные части сохраняются.',
    category: 'Режимы'
  },
  {
    term: 'Latent Space',
    definition: 'Сжатое математическое представление данных. Модели работают в latent space для эффективности, а затем декодируют результат в полноразмерное изображение.',
    category: 'Архитектура'
  },
  {
    term: 'LoRA (Low-Rank Adaptation)',
    definition: 'Метод тонкой настройки модели с минимальными вычислительными затратами. LoRA-адаптеры добавляют специфический стиль или персонажа без переобучения всей модели.',
    category: 'Архитектура'
  },
  {
    term: 'Negative Prompt',
    definition: 'Описание того, что НЕ должно присутствовать в результате. Например: «blurry, low quality, distorted faces» помогает избежать типичных артефактов.',
    category: 'Промптинг'
  },
  {
    term: 'Outpainting',
    definition: 'Расширение границ существующего изображения. Модель дорисовывает контент за пределами оригинальных краёв, сохраняя стиль и контекст.',
    category: 'Режимы'
  },
  {
    term: 'Prompt',
    definition: 'Текстовое описание желаемого результата генерации. Качественный промпт — ключевой фактор успешной генерации. Включает описание объектов, стиля, освещения, композиции.',
    category: 'Промптинг'
  },
  {
    term: 'Prompt Engineering',
    definition: 'Искусство составления эффективных промптов для получения желаемых результатов. Включает понимание того, как модель интерпретирует текст.',
    category: 'Промптинг'
  },
  {
    term: 'Resolution',
    definition: 'Размер выходного изображения в пикселях (например, 1024x1024). Для видео часто указывается как 720p, 1080p, 4K.',
    category: 'Параметры'
  },
  {
    term: 'Sampler',
    definition: 'Алгоритм, определяющий как модель шагает через latent space при генерации. Разные сэмплеры (Euler, DPM++, DDIM) дают разные результаты и скорость.',
    category: 'Параметры'
  },
  {
    term: 'Seed',
    definition: 'Начальное число для генератора случайных чисел. Одинаковый seed с теми же параметрами даёт идентичный результат, что позволяет воспроизводить удачные генерации.',
    category: 'Параметры'
  },
  {
    term: 'Stable Diffusion',
    definition: 'Открытая диффузионная модель для генерации изображений, разработанная Stability AI. Основа для многих производных моделей и техник.',
    category: 'Модели'
  },
  {
    term: 'Style Transfer',
    definition: 'Применение визуального стиля одного изображения к содержимому другого. Модель сохраняет объекты, но меняет художественную манеру.',
    category: 'Режимы'
  },
  {
    term: 'T2I (Text-to-Image)',
    definition: 'Базовый режим генерации изображений из текстового описания. Модель создаёт изображение «с нуля» на основе промпта.',
    category: 'Режимы'
  },
  {
    term: 'T2V (Text-to-Video)',
    definition: 'Режим генерации видео из текстового описания. Модель создаёт последовательность кадров, образующих связное видео.',
    category: 'Видео'
  },
  {
    term: 'Token',
    definition: 'Единица текста, на которую разбивается промпт для обработки моделью. Одно слово может состоять из 1-3 токенов. Модели имеют лимит на количество токенов.',
    category: 'Промптинг'
  },
  {
    term: 'Upscaling',
    definition: 'Увеличение разрешения изображения с добавлением деталей. AI-upscalers восстанавливают детали, которые были бы потеряны при обычном масштабировании.',
    category: 'Режимы'
  },
  {
    term: 'VAE (Variational Autoencoder)',
    definition: 'Нейросеть, кодирующая изображения в латентное представление и декодирующая обратно. Используется в диффузионных моделях для сжатия данных.',
    category: 'Архитектура'
  },
  {
    term: 'VRAM',
    definition: 'Видеопамять GPU. Более сложные модели и высокие разрешения требуют больше VRAM. Облачные сервисы снимают это ограничение с пользователя.',
    category: 'Архитектура'
  },
  {
    term: 'Weights',
    definition: 'Параметры нейросети, определяющие её поведение. Обученные weights содержат «знания» модели о том, как генерировать изображения.',
    category: 'Архитектура'
  },
  {
    term: '3D VAE',
    definition: 'Расширенная версия VAE, учитывающая временное измерение для обработки видео. Обеспечивает консистентность между кадрами и плавность движений.',
    category: 'Видео'
  }
];

// Категории для фильтрации
const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'Параметры', label: 'Параметры' },
  { id: 'Архитектура', label: 'Архитектура' },
  { id: 'Промптинг', label: 'Промптинг' },
  { id: 'Режимы', label: 'Режимы' },
  { id: 'Видео', label: 'Видео' },
  { id: 'Модели', label: 'Модели' },
];

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Фильтрация и сортировка терминов
  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS
      .filter(item => {
        const matchesSearch = searchQuery === '' || 
          item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.definition.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, activeCategory]);

  // Группировка по первой букве
  const groupedTerms = useMemo(() => {
    const groups: Record<string, typeof GLOSSARY_TERMS> = {};
    filteredTerms.forEach(term => {
      const firstLetter = term.term[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(term);
    });
    return groups;
  }, [filteredTerms]);

  const letters = Object.keys(groupedTerms).sort();

  return (
    <DocsShell>
      {/* Breadcrumb */}
      <DocsBreadcrumb 
        items={[
          { label: 'Главная', href: '/docs' },
          { label: 'Глоссарий' }
        ]} 
      />

      {/* Title Section */}
      <DocsTitle description="Справочник терминов и понятий, используемых в AI-генерации изображений и видео. Полезно для понимания параметров моделей и техник промптинга.">
        Глоссарий
      </DocsTitle>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 bg-transparent border border-[#2f2f2f] rounded-xl">
          <Search className="w-5 h-5 text-[#959595]" />
          <input
            type="text"
            placeholder="Поиск терминов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#959595] outline-none font-inter"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-[#959595] hover:text-white text-sm"
            >
              Очистить
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-1.5 rounded-lg font-inter text-sm transition-colors ${
                activeCategory === category.id
                  ? 'bg-white text-black font-medium'
                  : 'bg-transparent text-[#959595] hover:text-white border border-[#2f2f2f]'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-6 text-sm text-[#959595] font-inter">
        Найдено терминов: {filteredTerms.length}
      </div>

      {/* Alphabet Navigation */}
      {letters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {letters.map(letter => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 flex items-center justify-center bg-transparent rounded-lg text-white font-inter font-medium text-sm hover:bg-[#303030] transition-colors border border-[#2f2f2f]"
            >
              {letter}
            </a>
          ))}
        </div>
      )}

      {/* Terms List */}
      {filteredTerms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#959595] font-inter">Термины не найдены</p>
          <button 
            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            className="mt-2 text-white underline hover:no-underline text-sm"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {letters.map(letter => (
            <div key={letter} id={`letter-${letter}`}>
              {/* Letter Header */}
              <div className="flex items-center gap-4 mb-4">
                <span className="w-10 h-10 flex items-center justify-center bg-transparent rounded-xl text-white font-inter font-bold text-lg border border-[#2f2f2f]">
                  {letter}
                </span>
                <div className="flex-1 h-px bg-[#2f2f2f]" />
              </div>

              {/* Terms */}
              <div className="space-y-3">
                {groupedTerms[letter].map(item => (
                  <div 
                    key={item.term}
                    className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] hover:border-[#3f3f3f] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-inter font-semibold">{item.term}</h3>
                          <span className="px-2 py-0.5 bg-[#303030] rounded text-xs text-[#959595] font-inter">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-sm text-[#959595] font-inter leading-relaxed">
                          {item.definition}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back to top */}
      <div className="mt-8 mb-8 text-center">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-sm text-[#959595] hover:text-white transition-colors font-inter"
        >
          Вернуться наверх
        </button>
      </div>

      {/* Footer */}
      <DocsFooter />
    </DocsShell>
  );
}

