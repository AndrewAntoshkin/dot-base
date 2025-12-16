'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from '@/components/header';
import { 
  ChevronUp,
  ChevronDown,
  Pencil,
  Shield,
  User,
  UserX,
  UserCheck,
  ChevronDown as ChevronDownIcon,
  Calendar,
  X,
} from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { UserRole } from '@/lib/supabase/types';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, isSameDay, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AdminStats {
  totalWorkspaces: number;
  totalUsers: number;
  activeToday: number;
  totalGenerations: number;
  generationsToday: number;
  cost: number | null;
  costToday: number | null;
  failedGenerations: number;
  failedToday: number;
}

interface UserWithStats {
  id: string;
  email: string | null;
  telegram_username: string;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  created_at: string;
  last_login: string;
  is_active: boolean;
  credits: number;
  role: UserRole;
  generations_count?: number;
  total_credits_spent?: number;
  cost_rub?: number | null;
  workspace_name?: string | null;
}

interface UserGeneration {
  id: string;
  model_name: string;
  cost_credits: number;
  created_at: string;
  status: string;
}

interface ErrorItem {
  id: string;
  error_message: string;
  model_name: string;
  created_at: string;
  action: string;
}

interface ErrorAnalysis {
  total: number;
  today: number;
  topErrors: Array<{
    message: string;
    count: number;
    models: string[];
    lastSeen: string;
  }>;
  modelErrors: Array<{
    model: string;
    count: number;
  }>;
  errors: ErrorItem[];
}

interface FilterOption {
  id: string;
  name: string;
  email?: string;
  slug?: string;
}

interface AdminPageClientProps {
  userEmail: string | null;
}

type SortField = 'name' | 'status' | 'created' | 'generations' | 'cost' | 'role';
type SortDirection = 'asc' | 'desc';

// Date Range Picker Component
function DateRangePicker({
  startDate,
  endDate,
  onSelect,
  onClose,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onSelect: (start: Date | null, end: Date | null) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handleDayClick = (date: Date) => {
    if (selecting === 'start') {
      setTempStart(date);
      setTempEnd(null);
      setSelecting('end');
    } else {
      if (tempStart && isBefore(date, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
      setSelecting('start');
    }
  };

  const handleApply = () => {
    onSelect(tempStart, tempEnd);
    onClose();
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onSelect(null, null);
    onClose();
  };

  const isInRange = (date: Date) => {
    if (!tempStart || !tempEnd) return false;
    return isWithinInterval(date, { start: tempStart, end: tempEnd });
  };

  const quickRanges = [
    { label: 'Сегодня', start: new Date(), end: new Date() },
    { label: 'Вчера', start: subDays(new Date(), 1), end: subDays(new Date(), 1) },
    { label: '7 дней', start: subDays(new Date(), 7), end: new Date() },
    { label: '30 дней', start: subDays(new Date(), 30), end: new Date() },
    { label: 'Этот месяц', start: startOfMonth(new Date()), end: new Date() },
  ];

  return (
    <div className="absolute top-full left-0 mt-2 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl shadow-xl z-50 p-4 min-w-[320px]">
      {/* Quick ranges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickRanges.map((range) => (
          <button
            key={range.label}
            onClick={() => {
              setTempStart(range.start);
              setTempEnd(range.end);
            }}
            className="px-2 py-1 text-[12px] text-[#a2a2a2] hover:text-white hover:bg-[#252525] rounded transition-colors"
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          className="p-1 hover:bg-[#252525] rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <span className="font-inter font-medium text-[14px] text-white">
          {format(viewMonth, 'LLLL yyyy', { locale: ru })}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1 hover:bg-[#252525] rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="text-center text-[11px] text-[#6d6d6d] py-1">
            {d}
          </div>
        ))}
        {weeks.map((week, wi) => (
          week.map((date, di) => {
            const isCurrentMonth = date.getMonth() === viewMonth.getMonth();
            const isSelected = (tempStart && isSameDay(date, tempStart)) || (tempEnd && isSameDay(date, tempEnd));
            const isRange = isInRange(date);

            return (
              <button
                key={`${wi}-${di}`}
                onClick={() => handleDayClick(date)}
                className={`
                  w-8 h-8 text-[12px] rounded transition-colors
                  ${!isCurrentMonth ? 'text-[#4d4d4d]' : 'text-white'}
                  ${isSelected ? 'bg-[#6366F1] text-white' : ''}
                  ${isRange && !isSelected ? 'bg-[#6366F1]/30' : ''}
                  ${!isSelected && !isRange ? 'hover:bg-[#252525]' : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })
        ))}
      </div>

      {/* Selected range display */}
      <div className="flex items-center gap-2 mb-4 text-[13px] text-[#a2a2a2]">
        <span>{tempStart ? format(tempStart, 'dd.MM.yyyy') : '—'}</span>
        <span>→</span>
        <span>{tempEnd ? format(tempEnd, 'dd.MM.yyyy') : '—'}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="flex-1 px-3 py-2 text-[13px] text-[#a2a2a2] hover:text-white transition-colors"
        >
          Сбросить
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-3 py-2 bg-[#6366F1] text-white text-[13px] rounded-lg hover:bg-[#5558E3] transition-colors"
        >
          Применить
        </button>
      </div>
    </div>
  );
}

export default function AdminPageClient({ userEmail }: AdminPageClientProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('generations');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Filters
  const [filterOptions, setFilterOptions] = useState<{ workspaces: FilterOption[]; users: FilterOption[] }>({ workspaces: [], users: [] });
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Side sheet state
  const [sideSheetUser, setSideSheetUser] = useState<UserWithStats | null>(null);
  const [userGenerations, setUserGenerations] = useState<UserGeneration[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [generationsPage, setGenerationsPage] = useState(1);
  const [isSideSheetClosing, setIsSideSheetClosing] = useState(false);
  
  // Error analysis state
  const [showErrorAnalysis, setShowErrorAnalysis] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(null);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [errorModalTab, setErrorModalTab] = useState<'overview' | 'table'>('overview');
  
  // Получаем isSuperAdmin из контекста
  const { isSuperAdmin } = useUser();
  const itemsPerPage = 10;
  const generationsPerPage = 10;

  // Refs for click outside
  const workspaceRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/filter-options');
      if (res.ok) {
        const data = await res.json();
        setFilterOptions(data);
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query params
      const statsParams = new URLSearchParams();
      const usersParams = new URLSearchParams();
      
      if (selectedWorkspace) {
        statsParams.set('workspaceId', selectedWorkspace);
        usersParams.set('workspaceId', selectedWorkspace);
      }
      if (selectedUser) {
        statsParams.set('userId', selectedUser);
      }
      if (dateStart) {
        const startStr = format(dateStart, 'yyyy-MM-dd');
        statsParams.set('startDate', startStr);
        usersParams.set('startDate', startStr);
      }
      if (dateEnd) {
        const endStr = format(dateEnd, 'yyyy-MM-dd') + 'T23:59:59';
        statsParams.set('endDate', endStr);
        usersParams.set('endDate', endStr);
      }

      const [statsRes, usersRes] = await Promise.all([
        fetch(`/api/admin/stats?${statsParams}`),
        fetch(`/api/admin/users?${usersParams}`),
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkspace, selectedUser, dateStart, dateEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch error analysis
  const fetchErrorAnalysis = useCallback(async () => {
    setIsLoadingErrors(true);
    try {
      const res = await fetch('/api/admin/errors');
      if (res.ok) {
        const data = await res.json();
        setErrorAnalysis(data);
      }
    } catch (error) {
      console.error('Failed to fetch error analysis:', error);
    } finally {
      setIsLoadingErrors(false);
    }
  }, []);

  // Handle errors card click
  const handleErrorsCardClick = () => {
    setShowErrorAnalysis(true);
    fetchErrorAnalysis();
  };

  // Fetch user generations when side sheet opens
  const fetchUserGenerations = useCallback(async (userId: string) => {
    setIsLoadingGenerations(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/generations`);
      if (res.ok) {
        const data = await res.json();
        setUserGenerations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch user generations:', error);
    } finally {
      setIsLoadingGenerations(false);
    }
  }, []);

  // Open side sheet
  const handleRowClick = (user: UserWithStats) => {
    setSideSheetUser(user);
    setGenerationsPage(1);
    fetchUserGenerations(user.id);
  };

  // Close side sheet with animation
  const closeSideSheet = () => {
    setIsSideSheetClosing(true);
    setTimeout(() => {
      setSideSheetUser(null);
      setUserGenerations([]);
      setIsSideSheetClosing(false);
    }, 300);
  };

  // Sort function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Get user display name for sorting
  const getUserName = (user: UserWithStats) => {
    return (user.telegram_first_name || user.telegram_username || user.email?.split('@')[0] || '').toLowerCase();
  };

  // Get role priority for sorting
  const getRolePriority = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 0;
      case 'admin': return 1;
      default: return 2;
    }
  };

  // Sorted users
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = getUserName(a).localeCompare(getUserName(b));
          break;
        case 'status':
          comparison = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'generations':
          comparison = (a.generations_count || 0) - (b.generations_count || 0);
          break;
        case 'cost':
          comparison = (a.cost_rub || 0) - (b.cost_rub || 0);
          break;
        case 'role':
          comparison = getRolePriority(a.role) - getRolePriority(b.role);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [users, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage]);

  // Generations pagination
  const totalGenerationsPages = Math.ceil(userGenerations.length / generationsPerPage);
  const paginatedGenerations = useMemo(() => {
    const start = (generationsPage - 1) * generationsPerPage;
    return userGenerations.slice(start, start + generationsPerPage);
  }, [userGenerations, generationsPage]);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'updateRole', role: newRole }),
      });
      
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
    setOpenMenuId(null);
  };

  const handleToggleStatus = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'toggleStatus' }),
      });
      
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
    setOpenMenuId(null);
  };

  // Export to Excel with filters
  const handleExportExcel = () => {
    const headers = isSuperAdmin 
      ? ['Имя', 'Username', 'Email', 'Статус', 'Создан', 'Генерации', 'Стоимость (₽)', 'Роль']
      : ['Имя', 'Username', 'Email', 'Статус', 'Создан', 'Генерации', 'Роль'];
    
    const rows = sortedUsers.map(user => {
      const baseRow = [
        user.telegram_first_name || '-',
        user.telegram_username || '-',
        user.email || '-',
        user.is_active ? 'Активный' : 'Неактивен',
        new Date(user.created_at).toLocaleDateString('ru-RU'),
        user.generations_count || 0,
      ];
      
      if (isSuperAdmin) {
        baseRow.push(user.cost_rub ? user.cost_rub.toLocaleString('ru-RU') : '-');
      }
      
      baseRow.push(
        user.role === 'super_admin' ? 'Супер-админ' : user.role === 'admin' ? 'Админ' : 'Пользователь',
      );
      
      return baseRow;
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Формируем имя файла с учётом фильтров
    let filename = 'dashboard_report';
    if (dateStart && dateEnd) {
      filename += `_${format(dateStart, 'dd.MM.yyyy')}-${format(dateEnd, 'dd.MM.yyyy')}`;
    }
    filename += `_${new Date().toISOString().split('T')[0]}.csv`;
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export user generations
  const handleExportUserGenerations = () => {
    if (!sideSheetUser) return;
    
    const headers = ['Модель', 'Кредиты', 'Статус', 'Дата'];
    const rows = userGenerations.map(gen => [
      gen.model_name || '-',
      gen.cost_credits || 0,
      gen.status,
      new Date(gen.created_at).toLocaleDateString('ru-RU'),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sideSheetUser.email || sideSheetUser.telegram_username}_generations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Stats cards data
  const statsCards = [
    { label: 'Пространства', value: stats?.totalWorkspaces || 0, change: null },
    { label: 'Пользователи', value: stats?.totalUsers || 0, change: null },
    { label: 'Генерации', value: stats?.totalGenerations || 0, change: stats?.generationsToday ? `+${stats.generationsToday} сегодня` : null },
    // Стоимость только для super_admin
    ...(isSuperAdmin ? [{ label: 'Стоимость', value: stats && stats.cost !== null && stats.cost !== undefined ? `${stats.cost.toLocaleString('ru-RU')}₽` : '—', change: stats?.costToday ? `+${stats.costToday.toLocaleString('ru-RU')}₽` : null }] : []),
    ...(isSuperAdmin ? [{ label: 'Ошибки', value: stats?.failedGenerations || 0, change: stats?.failedToday ? `+${stats.failedToday} сегодня` : null, isError: true }] : []),
  ];

  // Pagination numbers
  const getPageNumbers = (total: number, current: number) => {
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3);
      if (current > 4) pages.push('...');
      if (current > 3 && current < total - 2) pages.push(current);
      if (current < total - 3) pages.push('...');
      pages.push(total - 2, total - 1, total);
    }
    return [...new Set(pages)];
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="w-3 h-3 text-[#535862] opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-white" />
      : <ChevronDown className="w-3 h-3 text-white" />;
  };

  // Sortable header component
  const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th className={`h-11 px-6 text-left ${className}`}>
      <button
        onClick={() => handleSort(field)}
        className="group flex items-center gap-1 font-inter font-semibold text-[12px] leading-[18px] text-[#a2a2a2] hover:text-white transition-colors"
      >
        {children}
        <SortIndicator field={field} />
      </button>
    </th>
  );

  // Get selected names
  const selectedWorkspaceName = filterOptions.workspaces.find(w => w.id === selectedWorkspace)?.name;
  const selectedUserName = filterOptions.users.find(u => u.id === selectedUser)?.name;
  const dateRangeLabel = dateStart && dateEnd 
    ? `${format(dateStart, 'dd.MM.yyyy')} - ${format(dateEnd, 'dd.MM.yyyy')}`
    : dateStart 
    ? `с ${format(dateStart, 'dd.MM.yyyy')}`
    : null;

  return (
    <div className="min-h-screen bg-[#101010]">
      <Header />
      
      <main className="px-4 lg:px-[80px] py-8">
        {/* Title */}
        <h1 className="font-inter font-semibold text-[20px] leading-[28px] tracking-[-0.4px] text-white mb-6">
          Dashboard
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          {isLoading ? (
            // Skeleton cards
            Array.from({ length: isSuperAdmin ? 5 : 3 }).map((_, idx) => (
              <div key={idx} className="border border-[#303030] rounded-[20px] p-6">
                <div className="h-5 w-24 bg-[#252525] rounded mb-3 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                <div className="flex items-end justify-between gap-2">
                  <div className="h-8 w-16 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                  <div className="h-4 w-20 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                </div>
              </div>
            ))
          ) : (
            statsCards.map((card, idx) => (
              <div 
                key={idx}
                onClick={'isError' in card && card.isError ? handleErrorsCardClick : undefined}
                className={`border border-[#303030] rounded-[20px] p-6 ${
                  'isError' in card && card.isError ? 'cursor-pointer hover:bg-[#1a1a1a] transition-colors' : ''
                }`}
              >
                <p className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2] mb-2">
                  {card.label}
                </p>
                <div className="flex items-end justify-between gap-2">
                  <p className={`font-inter font-semibold text-[24px] leading-[32px] ${
                    'isError' in card && card.isError && Number(card.value) > 0 ? 'text-red-400' : 'text-white'
                  }`}>
                    {card.value}
                  </p>
                  {card.change && (
                    <div className="flex items-center gap-2 py-1">
                      <span className={`font-inter font-normal text-[12px] leading-[16px] whitespace-nowrap ${
                        'isError' in card && card.isError ? 'text-red-400/70' : 'text-[#a2a2a2]'
                      }`}>
                        {card.change}
                      </span>
                      {/* Arrow up icon */}
                      <svg className={`w-4 h-4 shrink-0 ${
                        'isError' in card && card.isError ? 'text-red-400/70' : 'text-[#a2a2a2]'
                      }`} viewBox="0 0 16 16" fill="none">
                        <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-1 mb-4">
          {/* Workspace Filter */}
          <div ref={workspaceRef} className="relative">
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="flex items-center gap-2 h-9 px-3 bg-[#212121] rounded-[10px] hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="font-inter font-medium text-[14px] text-white">
                {selectedWorkspaceName || 'Все пространства'}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-white" />
            </button>
            {showWorkspaceDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl shadow-xl z-20 py-1 min-w-[180px] max-h-[300px] overflow-auto">
                <button
                  onClick={() => {
                    setSelectedWorkspace(null);
                    setShowWorkspaceDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[14px] hover:bg-[#252525] transition-colors ${
                    !selectedWorkspace ? 'text-white bg-[#252525]' : 'text-[#a2a2a2]'
                  }`}
                >
                  Все пространства
                </button>
                {filterOptions.workspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setSelectedWorkspace(w.id);
                      setShowWorkspaceDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[14px] hover:bg-[#252525] transition-colors ${
                      selectedWorkspace === w.id ? 'text-white bg-[#252525]' : 'text-[#a2a2a2]'
                    }`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Filter */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 h-9 px-3 bg-[#212121] rounded-[10px] hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="font-inter font-medium text-[14px] text-white">
                {selectedUserName || 'Все пользователи'}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-white" />
            </button>
            {showUserDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl shadow-xl z-20 py-1 min-w-[220px] max-h-[300px] overflow-auto">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setShowUserDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[14px] hover:bg-[#252525] transition-colors ${
                    !selectedUser ? 'text-white bg-[#252525]' : 'text-[#a2a2a2]'
                  }`}
                >
                  Все пользователи
                </button>
                {filterOptions.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u.id);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[14px] hover:bg-[#252525] transition-colors ${
                      selectedUser === u.id ? 'text-white bg-[#252525]' : 'text-[#a2a2a2]'
                    }`}
                  >
                    <span className="block truncate">{u.name}</span>
                    <span className="block text-[11px] text-[#6d6d6d] truncate">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div ref={dateRef} className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 h-9 px-3 bg-[#212121] rounded-[10px] hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="font-inter font-medium text-[14px] text-white">
                {dateRangeLabel || 'Выберите период'}
              </span>
              <Calendar className="w-4 h-4 text-white" />
            </button>
            {showDatePicker && (
              <DateRangePicker
                startDate={dateStart}
                endDate={dateEnd}
                onSelect={(start, end) => {
                  setDateStart(start);
                  setDateEnd(end);
                }}
                onClose={() => setShowDatePicker(false)}
              />
            )}
          </div>

          {/* Clear filters */}
          {(selectedWorkspace || selectedUser || dateStart) && (
            <button
              onClick={() => {
                setSelectedWorkspace(null);
                setSelectedUser(null);
                setDateStart(null);
                setDateEnd(null);
              }}
              className="flex items-center gap-1 px-2 py-2 text-[14px] text-[#a2a2a2] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export Button */}
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 h-9 px-3 bg-[#252525] rounded-lg text-white hover:bg-[#303030] transition-colors"
          >
            <span className="font-inter font-medium text-[14px]">
              Скачать отчет
            </span>
          </button>
        </div>

        {/* Table */}
        <div className="border border-[#252525] rounded-[12px] overflow-hidden shadow-sm">
          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#252525]">
                  <th className="h-11 px-6 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border border-[#404040] rounded-[6px]" />
                      <button
                        onClick={() => handleSort('name')}
                        className="group flex items-center gap-1 font-inter font-semibold text-[12px] leading-[18px] text-[#a2a2a2] hover:text-white transition-colors"
                      >
                        Имя
                        <SortIndicator field="name" />
                      </button>
                    </div>
                  </th>
                  <SortableHeader field="status">Статус</SortableHeader>
                  <SortableHeader field="created">Создан</SortableHeader>
                  <SortableHeader field="generations">Генерации</SortableHeader>
                  {isSuperAdmin && <SortableHeader field="cost">Стоимость</SortableHeader>}
                  <SortableHeader field="role">Роль</SortableHeader>
                  <th className="h-11 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Skeleton rows
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#252525]">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-[#252525] rounded-[6px] animate-pulse" />
                          <div className="space-y-2">
                            <div className="h-5 w-32 bg-[#252525] rounded animate-pulse" />
                            <div className="h-4 w-24 bg-[#252525] rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-6 w-20 bg-[#252525] rounded-[6px] animate-pulse" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-5 w-20 bg-[#252525] rounded animate-pulse" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-5 w-12 bg-[#252525] rounded animate-pulse" />
                      </td>
                      {isSuperAdmin && (
                        <td className="py-4 px-6">
                          <div className="h-5 w-16 bg-[#252525] rounded animate-pulse" />
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <div className="h-6 w-24 bg-[#252525] rounded-full animate-pulse" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <div className="w-10 h-10 bg-[#252525] rounded-lg animate-pulse" />
                          <div className="w-10 h-10 bg-[#252525] rounded-lg animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="h-[72px] text-center text-[#a2a2a2]">
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => handleRowClick(user)}
                      className="border-b border-[#252525] hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                    >
                      {/* Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border border-[#404040] rounded-[6px]" />
                          <div>
                            <p className="font-inter font-medium text-[14px] leading-[20px] text-white">
                              {user.telegram_first_name || user.telegram_username || user.email?.split('@')[0] || 'Пользователь'}
                            </p>
                            <p className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2]">
                              @{user.telegram_username || user.email?.split('@')[0] || 'unknown'}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] border shadow-sm ${
                          user.is_active 
                            ? 'border-[#636363]' 
                            : 'border-red-500/50'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            user.is_active ? 'bg-[#21D581]' : 'bg-red-500'
                          }`} />
                          <span className="font-inter font-medium text-[12px] leading-[18px] text-[#d7d7d7]">
                            {user.is_active ? 'Активный' : 'Неактивен'}
                          </span>
                        </div>
                      </td>
                      
                      {/* Created */}
                      <td className="py-4 px-6">
                        <span className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2]">
                          {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </td>
                      
                      {/* Generations */}
                      <td className="py-4 px-6">
                        <span className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2]">
                          {user.generations_count || 0}
                        </span>
                      </td>
                      
                      {/* Cost - only for super_admin */}
                      {isSuperAdmin && (
                        <td className="py-4 px-6">
                          <span className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2]">
                            {user.cost_rub ? `${user.cost_rub.toLocaleString('ru-RU')}₽` : '—'}
                          </span>
                        </td>
                      )}
                      
                      {/* Role */}
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center h-6 px-2 py-0.5 bg-[#404040] rounded-full">
                          <span className="font-inter font-medium text-[12px] leading-[18px] text-white">
                            {user.role === 'super_admin' ? 'Супер-админ' : user.role === 'admin' ? 'Админ' : 'Пользователь'}
                          </span>
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="py-4 px-4">
                        {user.role !== 'super_admin' && (
                          <div className="relative flex items-center gap-1">
                            <button 
                              onClick={(e) => handleToggleStatus(user.id, e)}
                              className="p-2.5 rounded-lg hover:bg-[#252525] transition-colors"
                              title={user.is_active ? 'Деактивировать' : 'Активировать'}
                            >
                              {user.is_active ? (
                                <UserX className="w-5 h-5 text-[#535862]" />
                              ) : (
                                <UserCheck className="w-5 h-5 text-[#535862]" />
                              )}
                            </button>
                            
                            {isSuperAdmin && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === user.id ? null : user.id);
                                }}
                                className="p-2.5 rounded-lg hover:bg-[#252525] transition-colors"
                                title="Изменить роль"
                              >
                                <Pencil className="w-5 h-5 text-[#535862]" />
                              </button>
                            )}
                            
                            {/* Role Menu */}
                            {openMenuId === user.id && isSuperAdmin && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                  }}
                                />
                                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-xl z-20 overflow-hidden">
                                  {user.role !== 'admin' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateRole(user.id, 'admin');
                                      }}
                                      className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-white hover:bg-[#2f2f2f] transition-colors"
                                    >
                                      <Shield className="w-4 h-4" />
                                      Сделать админом
                                    </button>
                                  )}
                                  {user.role === 'admin' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateRole(user.id, 'user');
                                      }}
                                      className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-white hover:bg-[#2f2f2f] transition-colors"
                                    >
                                      <User className="w-4 h-4" />
                                      Убрать админа
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-[#252525] flex items-center justify-center gap-3 bg-[#101010]">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 h-9 px-3 bg-[#252525] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#303030] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-inter font-semibold text-[14px] leading-[20px]">Назад</span>
              </button>

              <div className="flex gap-0.5">
                {getPageNumbers(totalPages, currentPage).map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                    disabled={page === '...'}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-inter font-medium text-[14px] transition-colors ${
                      page === currentPage
                        ? 'bg-[#252525] text-white'
                        : page === '...'
                        ? 'text-[#686868] cursor-default'
                        : 'text-[#686868] hover:bg-[#1f1f1f] hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 h-9 px-3 bg-[#252525] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#303030] transition-colors"
              >
                <span className="font-inter font-semibold text-[14px] leading-[20px]">Вперед</span>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Side Sheet Overlay */}
      {sideSheetUser && (
        <div 
          className={`fixed inset-0 z-[9999] flex items-center justify-end overflow-hidden transition-colors duration-300 ${
            isSideSheetClosing ? 'bg-black/0' : 'bg-black/60'
          }`}
          onClick={closeSideSheet}
        >
          <div 
            className={`flex items-start gap-2 h-full py-8 pr-8 transition-transform duration-300 ease-out ${
              isSideSheetClosing ? 'translate-x-full' : 'translate-x-0 animate-slide-in-right'
            }`}
          >
            {/* Close Button */}
            <button 
              onClick={closeSideSheet}
              className={`mt-3 p-0 hover:opacity-80 transition-opacity shrink-0 ${
                isSideSheetClosing ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="19" stroke="white" strokeOpacity="0.4" strokeWidth="2"/>
                <path d="M14 14L26 26M26 14L14 26" stroke="white" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Side Sheet Panel */}
            <div 
              className="bg-[#151515] rounded-[20px] w-[558px] h-full flex flex-col p-5 gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center">
                <h3 className="font-inter font-medium text-[18px] leading-[28px] text-white truncate">
                  {sideSheetUser.email || sideSheetUser.telegram_username || 'Пользователь'}
                </h3>
              </div>

              {/* Subheader */}
              <p className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2] tracking-[-0.28px]">
                История генераций
              </p>

              {/* Generations Table */}
              <div className="flex-1 border border-[#252525] rounded-[16px] overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#151515]">
                      <tr className="border-b border-[#252525]">
                        <th className="h-11 px-6 text-left">
                          <span className="font-inter font-semibold text-[12px] leading-[18px] text-[#a2a2a2]">
                            Модель
                          </span>
                        </th>
                        <th className="h-11 px-6 text-left w-[96px]">
                          <span className="font-inter font-semibold text-[12px] leading-[18px] text-[#a2a2a2]">
                            Токены
                          </span>
                        </th>
                        <th className="h-11 px-6 text-left w-[144px]">
                          <span className="font-inter font-semibold text-[12px] leading-[18px] text-[#a2a2a2]">
                            Дата генерации
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingGenerations ? (
                        // Skeleton rows for generations
                        Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i} className="border-b border-[#252525]">
                            <td className="h-[56px] px-6">
                              <div className="h-5 w-28 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                            </td>
                            <td className="h-[56px] px-6">
                              <div className="h-5 w-8 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                            </td>
                            <td className="h-[56px] px-6">
                              <div className="h-5 w-24 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                            </td>
                          </tr>
                        ))
                      ) : paginatedGenerations.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="h-[72px] text-center text-[#a2a2a2]">
                            Генерации не найдены
                          </td>
                        </tr>
                      ) : (
                        paginatedGenerations.map((gen) => (
                          <tr key={gen.id} className="border-b border-[#252525]">
                            <td className="h-[72px] px-6">
                              <span className="font-inter font-normal text-[14px] leading-[20px] text-[#e1e1e1]">
                                {gen.model_name || '-'}
                              </span>
                            </td>
                            <td className="h-[72px] px-6">
                              <span className="font-inter font-normal text-[14px] leading-[20px] text-[#e1e1e1]">
                                {gen.cost_credits || 0}
                              </span>
                            </td>
                            <td className="h-[72px] px-6">
                              <span className="font-inter font-normal text-[14px] leading-[20px] text-[#e1e1e1]">
                                {new Date(gen.created_at).toLocaleDateString('ru-RU')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Generations Pagination */}
                {totalGenerationsPages > 1 && (
                  <div className="px-6 py-2 border-t border-[#252525] flex justify-center bg-[#151515]">
                    <div className="flex gap-0.5">
                      {getPageNumbers(totalGenerationsPages, generationsPage).map((page, idx) => (
                        <button
                          key={idx}
                          onClick={() => typeof page === 'number' && setGenerationsPage(page)}
                          disabled={page === '...'}
                          className={`w-8 h-8 flex items-center justify-center rounded-[6.4px] font-inter font-medium text-[11.2px] transition-colors ${
                            page === generationsPage
                              ? 'bg-[#252525] text-white'
                              : page === '...'
                              ? 'text-[#686868] cursor-default'
                              : 'text-[#686868] hover:bg-[#1f1f1f]'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Download Button */}
              <div className="flex justify-end pt-3">
                <button 
                  onClick={handleExportUserGenerations}
                  className="flex items-center gap-2 px-3 py-2 bg-[#252525] rounded-lg text-white hover:bg-[#303030] transition-colors"
                >
                  <span className="font-inter font-semibold text-[14px] leading-[20px]">
                    Скачать отчет
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Analysis Modal (только для super_admin) */}
      {showErrorAnalysis && isSuperAdmin && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-8"
          onClick={() => setShowErrorAnalysis(false)}
        >
          <div 
            className="bg-[#151515] rounded-[20px] w-full max-w-[800px] max-h-[80vh] flex flex-col p-6 gap-4 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-inter font-semibold text-[20px] text-white">
                Анализ ошибок
              </h3>
              <button 
                onClick={() => setShowErrorAnalysis(false)}
                className="p-2 hover:bg-[#252525] rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[#252525] pb-3">
              <button
                onClick={() => setErrorModalTab('overview')}
                className={`px-4 py-2 rounded-lg font-inter font-medium text-sm transition-colors ${
                  errorModalTab === 'overview' 
                    ? 'bg-[#252525] text-white' 
                    : 'text-[#a2a2a2] hover:text-white'
                }`}
              >
                Обзор
              </button>
              <button
                onClick={() => setErrorModalTab('table')}
                className={`px-4 py-2 rounded-lg font-inter font-medium text-sm transition-colors ${
                  errorModalTab === 'table' 
                    ? 'bg-[#252525] text-white' 
                    : 'text-[#a2a2a2] hover:text-white'
                }`}
              >
                Таблица
              </button>
            </div>

            {isLoadingErrors ? (
              <div className="flex-1 flex items-center justify-center text-[#a2a2a2]">
                Загрузка...
              </div>
            ) : errorAnalysis ? (
              <>
                {/* Overview Tab */}
                {errorModalTab === 'overview' && (
                  <div className="flex-1 overflow-auto space-y-6">
                    {/* Summary */}
                    <div className="flex gap-4">
                      <div className="bg-[#1f1f1f] rounded-xl p-4 flex-1">
                        <p className="text-[#a2a2a2] text-sm">Всего ошибок</p>
                        <p className="text-red-400 text-2xl font-semibold">{errorAnalysis.total}</p>
                      </div>
                      <div className="bg-[#1f1f1f] rounded-xl p-4 flex-1">
                        <p className="text-[#a2a2a2] text-sm">Сегодня</p>
                        <p className="text-red-400 text-2xl font-semibold">{errorAnalysis.today}</p>
                      </div>
                    </div>

                    {/* Top Errors */}
                    <div>
                      <h4 className="font-inter font-semibold text-[16px] text-white mb-3">
                        Топ ошибок
                      </h4>
                      <div className="space-y-2">
                        {errorAnalysis.topErrors.map((err, idx) => (
                          <div key={idx} className="bg-[#1f1f1f] rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-mono break-all">
                                  {err.message}
                                </p>
                                <p className="text-[#a2a2a2] text-xs mt-1">
                                  Модели: {err.models.join(', ')}
                                </p>
                              </div>
                              <div className="shrink-0 bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm font-semibold">
                                {err.count}x
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Errors by Model */}
                    <div>
                      <h4 className="font-inter font-semibold text-[16px] text-white mb-3">
                        Ошибки по моделям
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {errorAnalysis.modelErrors.map((item, idx) => (
                          <div key={idx} className="bg-[#1f1f1f] rounded-xl p-3 flex items-center justify-between">
                            <span className="text-white text-sm truncate">{item.model}</span>
                            <span className="text-red-400 font-semibold ml-2">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Tab */}
                {errorModalTab === 'table' && (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[#151515]">
                        <tr className="border-b border-[#252525]">
                          <th className="h-11 px-4 text-left">
                            <span className="font-inter font-semibold text-[12px] text-[#a2a2a2]">
                              Модель
                            </span>
                          </th>
                          <th className="h-11 px-4 text-left">
                            <span className="font-inter font-semibold text-[12px] text-[#a2a2a2]">
                              Ошибка
                            </span>
                          </th>
                          <th className="h-11 px-4 text-left w-[140px]">
                            <span className="font-inter font-semibold text-[12px] text-[#a2a2a2]">
                              Дата
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorAnalysis.errors.map((err) => (
                          <tr key={err.id} className="border-b border-[#252525] hover:bg-[#1a1a1a]">
                            <td className="h-[56px] px-4">
                              <span className="font-inter text-[13px] text-white">
                                {err.model_name}
                              </span>
                            </td>
                            <td className="h-[56px] px-4">
                              <p className="font-inter text-[13px] text-[#a2a2a2] font-mono truncate max-w-[400px]" title={err.error_message}>
                                {err.error_message}
                              </p>
                            </td>
                            <td className="h-[56px] px-4">
                              <span className="font-inter text-[13px] text-[#a2a2a2]">
                                {new Date(err.created_at).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#a2a2a2]">
                Не удалось загрузить данные
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
