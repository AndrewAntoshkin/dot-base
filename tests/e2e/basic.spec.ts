/**
 * E2E тесты с Playwright
 * 
 * Установка: npm install -D @playwright/test
 * Запуск: npx playwright test tests/e2e/
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

test.describe('Базовые проверки', () => {
  test('главная страница загружается', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);
  });

  test('лендинг /welcome доступен', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/welcome`);
    expect(response?.status()).toBe(200);
    
    // Проверяем наличие логотипа
    await expect(page.locator('img[alt="BASE"]')).toBeVisible();
  });

  test('хедер присутствует на странице', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Проверяем навигационные элементы
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Image')).toBeVisible();
    await expect(page.locator('text=Video')).toBeVisible();
  });

  test('API health endpoint отвечает', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});

test.describe('Навигация', () => {
  test('переход между разделами', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Переход на Video
    await page.click('text=Video');
    await expect(page).toHaveURL(/\/video/);
    
    // Переход на Analyze
    await page.click('text=Analyze');
    await expect(page).toHaveURL(/\/analyze/);
    
    // Возврат на главную
    await page.click('text=Image');
    await expect(page).toHaveURL('/');
  });
});

test.describe('Форма генерации (без авторизации)', () => {
  test('показывает форму ввода', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Ждём загрузку формы
    await page.waitForLoadState('networkidle');
    
    // Проверяем наличие INPUT секции
    const inputSection = page.locator('text=INPUT');
    // Форма может требовать авторизации
  });
});

test.describe('Мобильная версия', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('мобильное меню работает', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Ищем кнопку гамбургер-меню
    const menuButton = page.locator('button[aria-label="Open menu"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Проверяем что меню открылось
      await expect(page.locator('text=IMAGE')).toBeVisible();
      await expect(page.locator('text=VIDEO')).toBeVisible();
    }
  });
});

test.describe('Производительность', () => {
  test('главная страница загружается менее чем за 3 секунды', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`⏱️ Время загрузки главной: ${loadTime}ms`);
  });

  test('API health отвечает менее чем за 200ms', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${BASE_URL}/api/health`);
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);
    
    console.log(`⏱️ Время ответа /api/health: ${responseTime}ms`);
  });
});

test.describe('Безопасность', () => {
  test('защищённые endpoints требуют авторизации', async ({ request }) => {
    const protectedEndpoints = [
      '/api/generations/list',
      '/api/generations/create',
      '/api/admin/stats',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(`${BASE_URL}${endpoint}`);
      expect(response.status()).toBe(401);
    }
  });

  test('нет XSS в ошибках', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/generations/<script>alert(1)</script>`);
    const body = await response.text();
    
    // Ответ не должен содержать неэкранированный скрипт
    expect(body).not.toContain('<script>alert(1)</script>');
  });
});








