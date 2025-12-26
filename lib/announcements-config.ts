/**
 * Конфигурация анонсов для плашек над хедером
 * 
 * При добавлении новой модели или функции:
 * 1. Добавь новый анонс в массив ANNOUNCEMENTS
 * 2. Укажи уникальный id, текст, и куда вести при клике на "Попробовать"
 * 3. Если пользователь закрыл анонс - он больше не покажется (сохраняется в localStorage)
 */

export interface Announcement {
  /** Уникальный ID анонса (используется для сохранения в localStorage) */
  id: string;
  /** Текст анонса */
  text: string;
  /** Текст кнопки действия */
  actionLabel: string;
  /** Путь куда переходить по клику (например '/?model=flux-2-max') */
  actionUrl: string;
  /** Активен ли анонс (можно отключить не удаляя) */
  active: boolean;
  /** Дата создания (для сортировки, показываем самый новый) */
  createdAt: string;
}

/**
 * Список всех анонсов
 * Показывается только первый активный анонс, который пользователь ещё не закрыл
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'seedance-1.5-pro-release',
    text: 'Новая модель Seedance 1.5 Pro — видео с синхронизированным аудио и lip-sync',
    actionLabel: 'Попробовать',
    actionUrl: '/video?model=seedance-1.5-pro-t2v',
    active: true,
    createdAt: '2025-12-26',
  },
  {
    id: 'flux-2-max-release',
    text: 'Появилась новая модель для создания изображений – FLUX 2 Max',
    actionLabel: 'Попробовать',
    actionUrl: '/?model=flux-2-max',
    active: false, // Деактивирован в пользу нового анонса
    createdAt: '2025-12-18',
  },
  // Пример для будущих анонсов:
  // {
  //   id: 'video-feature-release',
  //   text: 'Новая функция: создание видео из изображений',
  //   actionLabel: 'Попробовать',
  //   actionUrl: '/video',
  //   active: false,
  //   createdAt: '2025-12-20',
  // },
];

/**
 * Ключ для localStorage где храним ID закрытых анонсов
 */
export const DISMISSED_ANNOUNCEMENTS_KEY = 'dismissed_announcements';

/**
 * Получить список ID закрытых анонсов из localStorage
 */
export function getDismissedAnnouncementIds(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Сохранить ID закрытого анонса в localStorage
 */
export function dismissAnnouncement(announcementId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const dismissed = getDismissedAnnouncementIds();
    if (!dismissed.includes(announcementId)) {
      dismissed.push(announcementId);
      localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Получить первый активный анонс, который пользователь ещё не закрыл
 */
export function getActiveAnnouncement(dismissedIds: string[]): Announcement | null {
  // Сортируем по дате (новые первые) и берём первый активный не закрытый
  const sorted = [...ANNOUNCEMENTS]
    .filter(a => a.active && !dismissedIds.includes(a.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return sorted[0] || null;
}






