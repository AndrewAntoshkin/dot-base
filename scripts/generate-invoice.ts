/**
 * Генерация счёта по данным из базы
 * 
 * Usage:
 *   npx tsx scripts/generate-invoice.ts                    # Текущий месяц
 *   npx tsx scripts/generate-invoice.ts --month=2025-12    # Декабрь 2025
 *   npx tsx scripts/generate-invoice.ts --workspace=yandex-eda --month=2025-12
 *   npx tsx scripts/generate-invoice.ts --all-time         # За всё время
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pricing constants
const TOKEN_PRICE_RUB = 0.3;
const USD_TO_RUB = 80;
const MARKUP = 1.5;

// Parse args
const args = process.argv.slice(2);
const monthArg = args.find(a => a.startsWith('--month='))?.split('=')[1];
const workspaceArg = args.find(a => a.startsWith('--workspace='))?.split('=')[1];
const allTime = args.includes('--all-time');
const outputJson = args.includes('--json');

interface WorkspaceStats {
  id: string;
  name: string;
  slug: string;
  totalGenerations: number;
  completedGenerations: number;
  failedGenerations: number;
  totalCostUsd: number;
  totalCostRub: number;
  totalCostWithMarkup: number;
  totalTokens: number;
  activeUsers: number;
  users: UserStats[];
}

interface UserStats {
  id: string;
  email: string | null;
  telegramUsername: string | null;
  generations: number;
  costUsd: number;
  costRub: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  periodStart: string;
  periodEnd: string;
  workspaces: WorkspaceStats[];
  totals: {
    generations: number;
    activeUsers: number;
    costUsd: number;
    costRubWithMarkup: number;
    tokens: number;
  };
}

function getDateRange(monthStr?: string, allTime?: boolean): { start: Date; end: Date } {
  if (allTime) {
    return {
      start: new Date('2024-01-01'),
      end: new Date()
    };
  }
  
  if (monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return { start, end };
  }
  
  // Current month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateRu(date: Date): string {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function numberToWordsRu(num: number): string {
  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 
                 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 
                'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 
                    'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  const thousands = ['тысяча', 'тысячи', 'тысяч'];
  
  if (num === 0) return 'ноль';
  
  const n = Math.floor(num);
  const parts: string[] = [];
  
  // Hundreds of thousands
  const hundredThousands = Math.floor(n / 100000) % 10;
  if (hundredThousands > 0) parts.push(hundreds[hundredThousands]);
  
  // Tens of thousands
  const tenThousands = Math.floor(n / 10000) % 10;
  const oneThousands = Math.floor(n / 1000) % 10;
  
  if (tenThousands === 1) {
    parts.push(teens[oneThousands]);
    parts.push(thousands[2]);
  } else {
    if (tenThousands > 0) parts.push(tens[tenThousands]);
    if (oneThousands > 0) {
      // Female form for thousands
      if (oneThousands === 1) parts.push('одна');
      else if (oneThousands === 2) parts.push('две');
      else parts.push(ones[oneThousands]);
    }
    if (oneThousands === 1) parts.push(thousands[0]);
    else if (oneThousands >= 2 && oneThousands <= 4) parts.push(thousands[1]);
    else if (oneThousands >= 5 || tenThousands > 0) parts.push(thousands[2]);
  }
  
  // Hundreds
  const hundredsDigit = Math.floor(n / 100) % 10;
  if (hundredsDigit > 0) parts.push(hundreds[hundredsDigit]);
  
  // Tens and ones
  const tensDigit = Math.floor(n / 10) % 10;
  const onesDigit = n % 10;
  
  if (tensDigit === 1) {
    parts.push(teens[onesDigit]);
  } else {
    if (tensDigit > 0) parts.push(tens[tensDigit]);
    if (onesDigit > 0) parts.push(ones[onesDigit]);
  }
  
  return parts.join(' ');
}

async function generateInvoice(): Promise<void> {
  const { start, end } = getDateRange(monthArg, allTime);
  
  console.log('📊 Генерация счёта...');
  console.log(`   Период: ${formatDate(start)} — ${formatDate(end)}`);
  if (workspaceArg) console.log(`   Воркспейс: ${workspaceArg}`);
  console.log('');

  // Get workspaces
  let workspacesQuery = supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('is_active', true);
  
  if (workspaceArg) {
    workspacesQuery = workspacesQuery.eq('slug', workspaceArg);
  }

  const { data: workspaces, error: wsError } = await workspacesQuery;
  
  if (wsError) {
    console.error('Error fetching workspaces:', wsError);
    return;
  }

  if (!workspaces || workspaces.length === 0) {
    console.log('No workspaces found');
    return;
  }

  const workspaceStats: WorkspaceStats[] = [];
  
  for (const ws of workspaces) {
    // Get generations for this workspace in the date range
    const { data: generations, error: genError } = await supabase
      .from('generations')
      .select(`
        id,
        user_id,
        status,
        cost_usd,
        users!inner(id, email, telegram_username)
      `)
      .eq('workspace_id', ws.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (genError) {
      console.error(`Error fetching generations for ${ws.name}:`, genError);
      continue;
    }

    if (!generations || generations.length === 0) {
      continue;
    }

    // Calculate stats
    const userStatsMap: Record<string, UserStats> = {};
    let totalCostUsd = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const gen of generations) {
      const user = gen.users as any;
      const userId = gen.user_id;
      
      if (!userStatsMap[userId]) {
        userStatsMap[userId] = {
          id: userId,
          email: user?.email || null,
          telegramUsername: user?.telegram_username || null,
          generations: 0,
          costUsd: 0,
          costRub: 0
        };
      }
      
      userStatsMap[userId].generations++;
      
      if (gen.status === 'completed') {
        completedCount++;
        const cost = gen.cost_usd || 0;
        totalCostUsd += cost;
        userStatsMap[userId].costUsd += cost;
      } else if (gen.status === 'failed') {
        failedCount++;
      }
    }

    // Convert to RUB with markup
    const totalCostWithMarkup = totalCostUsd * MARKUP * USD_TO_RUB;
    const totalTokens = Math.round(totalCostWithMarkup / TOKEN_PRICE_RUB);

    // Update user stats with RUB
    const users = Object.values(userStatsMap).map(u => ({
      ...u,
      costRub: Math.round(u.costUsd * MARKUP * USD_TO_RUB)
    })).sort((a, b) => b.costRub - a.costRub);

    workspaceStats.push({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      totalGenerations: generations.length,
      completedGenerations: completedCount,
      failedGenerations: failedCount,
      totalCostUsd,
      totalCostRub: totalCostUsd * USD_TO_RUB,
      totalCostWithMarkup,
      totalTokens,
      activeUsers: users.length,
      users
    });
  }

  if (workspaceStats.length === 0) {
    console.log('No data found for the specified period');
    return;
  }

  // Calculate totals
  const totals = {
    generations: workspaceStats.reduce((sum, ws) => sum + ws.completedGenerations, 0),
    activeUsers: workspaceStats.reduce((sum, ws) => sum + ws.activeUsers, 0),
    costUsd: workspaceStats.reduce((sum, ws) => sum + ws.totalCostUsd, 0),
    costRubWithMarkup: workspaceStats.reduce((sum, ws) => sum + ws.totalCostWithMarkup, 0),
    tokens: workspaceStats.reduce((sum, ws) => sum + ws.totalTokens, 0)
  };

  // Generate invoice number
  const invoiceDate = new Date();
  const invoiceNumber = `BC-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(invoiceDate.getDate()).padStart(2, '0')}`;

  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate: formatDateRu(invoiceDate),
    periodStart: formatDateRu(start),
    periodEnd: formatDateRu(end),
    workspaces: workspaceStats,
    totals
  };

  if (outputJson) {
    console.log(JSON.stringify(invoiceData, null, 2));
    return;
  }

  // Print invoice
  printInvoice(invoiceData);
  
  // Save markdown
  const markdown = generateMarkdown(invoiceData);
  const filename = `invoice-${formatDate(start)}-${formatDate(end)}.md`;
  fs.writeFileSync(filename, markdown);
  console.log(`\n✅ Сохранено в ${filename}`);
}

function printInvoice(data: InvoiceData): void {
  console.log('═'.repeat(80));
  console.log('                           СЧЁТ НА ОПЛАТУ');
  console.log('═'.repeat(80));
  console.log('');
  console.log(`Номер: ${data.invoiceNumber}`);
  console.log(`Дата: ${data.invoiceDate}`);
  console.log('');
  console.log('─'.repeat(80));
  console.log('');
  console.log('ПЕРИОД ОКАЗАНИЯ УСЛУГ');
  console.log(`С: ${data.periodStart}`);
  console.log(`По: ${data.periodEnd}`);
  console.log('');
  
  for (const ws of data.workspaces) {
    console.log('─'.repeat(80));
    console.log(`\nВОРКСПЕЙС: ${ws.name}`);
    console.log(`Активных пользователей: ${ws.activeUsers}`);
    console.log(`Операций: ${ws.completedGenerations.toLocaleString('ru-RU')}`);
    console.log(`Токенов: ${ws.totalTokens.toLocaleString('ru-RU')}`);
    console.log(`Стоимость: ${Math.round(ws.totalCostWithMarkup).toLocaleString('ru-RU')} ₽`);
    
    console.log('\nТоп пользователей:');
    ws.users.slice(0, 10).forEach((u, i) => {
      const name = u.email || u.telegramUsername || u.id.slice(0, 8);
      console.log(`  ${(i+1).toString().padStart(2)}. ${name.padEnd(35)} ${u.generations.toString().padStart(5)} ген. | ${u.costRub.toLocaleString('ru-RU').padStart(8)} ₽`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('                              ИТОГО');
  console.log('═'.repeat(80));
  console.log(`Активных пользователей: ${data.totals.activeUsers}`);
  console.log(`Всего операций: ${data.totals.generations.toLocaleString('ru-RU')}`);
  console.log(`Всего токенов: ${data.totals.tokens.toLocaleString('ru-RU')}`);
  console.log(`Цена за токен: ${TOKEN_PRICE_RUB} ₽`);
  console.log('');
  console.log(`ИТОГО К ОПЛАТЕ: ${Math.round(data.totals.costRubWithMarkup).toLocaleString('ru-RU')} ₽`);
  console.log(`(${numberToWordsRu(Math.round(data.totals.costRubWithMarkup))} рублей)`);
  console.log('═'.repeat(80));
}

function generateMarkdown(data: InvoiceData): string {
  const totalRub = Math.round(data.totals.costRubWithMarkup);
  
  let md = `# СЧЁТ НА ОПЛАТУ

**Номер:** ${data.invoiceNumber}  
**Дата:** ${data.invoiceDate}

---

## ЗАКАЗЧИК

**Группа пользователей:** ${data.workspaces.map(ws => ws.name).join(', ')}  
**Количество пользователей:** ${data.totals.activeUsers}

---

## ПЕРИОД ОКАЗАНИЯ УСЛУГ

**С:** ${data.periodStart}  
**По:** ${data.periodEnd}  

---

## УСЛУГИ

| Период | Количество токенов | Цена за единицу | Сумма |
|--------|-------------------:|----------------:|------:|
`;

  for (const ws of data.workspaces) {
    md += `| ${ws.name} | ${ws.totalTokens.toLocaleString('ru-RU')} токенов | ${TOKEN_PRICE_RUB} ₽ | ${Math.round(ws.totalCostWithMarkup).toLocaleString('ru-RU')} ₽ |\n`;
  }
  
  md += `| **ИТОГО** | **${data.totals.tokens.toLocaleString('ru-RU')} токенов** | **${TOKEN_PRICE_RUB} ₽** | **${totalRub.toLocaleString('ru-RU')} ₽** |

---

## Детализация использования

`;

  for (const ws of data.workspaces) {
    md += `**${ws.name}:**
- Операций: ${ws.completedGenerations.toLocaleString('ru-RU')}
- Активных пользователей: ${ws.activeUsers}
- Стоимость на пользователя: ${Math.round(ws.totalCostWithMarkup / ws.activeUsers).toLocaleString('ru-RU')} ₽

`;
  }

  md += `**За весь период:**
- Всего операций: ${data.totals.generations.toLocaleString('ru-RU')}
- Активных пользователей: ${data.totals.activeUsers}
- Средняя стоимость на пользователя: ${Math.round(totalRub / data.totals.activeUsers).toLocaleString('ru-RU')} ₽

---

## ИТОГО К ОПЛАТЕ

**Сумма: ${totalRub.toLocaleString('ru-RU')} ₽**

*(${numberToWordsRu(totalRub)} рублей)*

---

## РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ

*[Заполняется при необходимости]*

---

## ПОДПИСЬ

**Исполнитель:** ___________________

**Дата:** «___» __________ ${new Date().getFullYear()} г.

---

*Счёт действителен в течение 30 дней с даты выставления*
`;

  return md;
}

generateInvoice().catch(console.error);




