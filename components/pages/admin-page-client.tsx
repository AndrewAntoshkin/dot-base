'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/header';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Pencil,
  TrendingUp,
  Shield,
  User,
  UserX,
  UserCheck,
  Download,
} from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { UserRole } from '@/lib/supabase/types';

interface AdminStats {
  totalUsers: number;
  activeToday: number;
  totalGenerations: number;
  generationsToday: number;
  failedGenerations: number;
  failedToday: number;
  uniqueModelsCount: number;
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

interface AdminPageClientProps {
  userEmail: string | null;
}

type SortField = 'name' | 'status' | 'generations' | 'email' | 'role';
type SortDirection = 'asc' | 'desc';

export default function AdminPageClient({ userEmail }: AdminPageClientProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Side sheet state
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [userGenerations, setUserGenerations] = useState<UserGeneration[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [generationsPage, setGenerationsPage] = useState(1);
  const [isSideSheetClosing, setIsSideSheetClosing] = useState(false);
  
  // Error analysis state
  const [showErrorAnalysis, setShowErrorAnalysis] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(null);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [errorModalTab, setErrorModalTab] = useState<'overview' | 'table'>('overview');
  
  // Получаем isSuperAdmin из контекста (роль загружена из БД)
  const { isSuperAdmin } = useUser();
  const itemsPerPage = 10;
  const generationsPerPage = 10;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
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
  }, []);

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
    setSelectedUser(user);
    setGenerationsPage(1);
    fetchUserGenerations(user.id);
  };

  // Close side sheet with animation
  const closeSideSheet = () => {
    setIsSideSheetClosing(true);
    setTimeout(() => {
      setSelectedUser(null);
      setUserGenerations([]);
      setIsSideSheetClosing(false);
    }, 300); // Match animation duration
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
        case 'generations':
          comparison = (a.generations_count || 0) - (b.generations_count || 0);
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
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
    e.stopPropagation(); // Prevent row click
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

  // Export to Excel
  const handleExportExcel = () => {
    // Create CSV content
    const headers = ['Имя', 'Username', 'Email', 'Статус', 'Роль', 'Генерации', 'Кредиты', 'Дата регистрации', 'Последний вход'];
    const rows = users.map(user => [
      user.telegram_first_name || '-',
      user.telegram_username || '-',
      user.email || '-',
      user.is_active ? 'Активный' : 'Неактивен',
      user.role === 'super_admin' ? 'Супер-админ' : user.role === 'admin' ? 'Админ' : 'Пользователь',
      user.generations_count || 0,
      user.credits || 0,
      new Date(user.created_at).toLocaleDateString('ru-RU'),
      new Date(user.last_login).toLocaleDateString('ru-RU'),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export user generations to Excel
  const handleExportUserGenerations = () => {
    if (!selectedUser) return;
    
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
    link.download = `${selectedUser.email || selectedUser.telegram_username}_generations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Stats cards data (ошибки только для super_admin)
  const statsCards = [
    { label: 'Пользователи', value: stats?.totalUsers || 0, change: stats?.activeToday ? `+${stats.activeToday} сегодня` : null },
    { label: 'Генерации', value: stats?.totalGenerations || 0, change: stats?.generationsToday ? `+${stats.generationsToday} сегодня` : null },
    ...(isSuperAdmin ? [{ label: 'Ошибки', value: stats?.failedGenerations || 0, change: stats?.failedToday ? `+${stats.failedToday} сегодня` : null, isError: true }] : []),
    { label: 'Моделей', value: stats?.uniqueModelsCount || 0, change: null },
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

  return (
    <div className="min-h-screen bg-[#101010]">
      <Header />
      
      <main className="px-[80px] py-8">
        {/* Title */}
        <h1 className="font-inter font-semibold text-[20px] leading-[28px] tracking-[-0.4px] text-white mb-6">
          Dashboard
        </h1>

        {/* Stats Cards */}
        <div className="flex gap-3 mb-4">
          {statsCards.map((card, idx) => (
            <div 
              key={idx}
              onClick={'isError' in card && card.isError ? handleErrorsCardClick : undefined}
              className={`flex-1 border border-[#2f2f2f] rounded-[20px] p-6 min-w-[200px] ${
                'isError' in card && card.isError ? 'cursor-pointer hover:bg-[#1f1f1f] transition-colors' : ''
              }`}
            >
              <p className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2] mb-2">
                {card.label}
              </p>
              <div className="flex items-end justify-between">
                <p className={`font-inter font-semibold text-[24px] leading-[32px] ${
                  'isError' in card && card.isError && Number(card.value) > 0 ? 'text-red-400' : 'text-white'
                }`}>
                  {isLoading ? '...' : card.value}
                </p>
                {card.change && (
                  <div className="flex items-center gap-2 py-1">
                    <span className={`font-inter font-normal text-[12px] leading-[16px] ${
                      'isError' in card && card.isError ? 'text-red-400/70' : 'text-[#a2a2a2]'
                    }`}>
                      {card.change}
                    </span>
                    <TrendingUp className={`w-4 h-4 ${
                      'isError' in card && card.isError ? 'text-red-400/70' : 'text-[#a2a2a2]'
                    }`} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#151515] border border-[#252525] rounded-[12px] overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-5 border-b border-[#252525] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-inter font-semibold text-[18px] leading-[28px] text-[#e9eaeb]">
                Пользователи
              </h2>
              <div className="bg-[#2c2c2c] rounded-[6px] px-1.5 min-w-[20px] h-5 flex items-center justify-center">
                <span className="font-inter font-medium text-[10px] text-white">
                  {users.length}
                </span>
              </div>
            </div>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-[#252525] rounded-lg text-white hover:bg-[#303030] transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="font-inter font-semibold text-[14px] leading-[20px]">
                Скачать отчет
              </span>
            </button>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#252525]">
                  <th className="h-11 px-6 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border border-neutral-700 rounded-[6px]" />
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
                  <SortableHeader field="generations">Генерации</SortableHeader>
                  <SortableHeader field="email">Email</SortableHeader>
                  <SortableHeader field="role">Роль</SortableHeader>
                  <th className="h-11 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="h-[72px] text-center text-[#a2a2a2]">
                      Загрузка...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-[72px] text-center text-[#a2a2a2]">
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
                      <td className="h-[72px] px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border border-neutral-700 rounded-[6px]" />
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
                      <td className="h-[72px] px-6">
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] border ${
                          user.is_active 
                            ? 'border-[#636363]' 
                            : 'border-red-500/50'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            user.is_active ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-inter font-medium text-[12px] leading-[18px] text-[#d7d7d7]">
                            {user.is_active ? 'Активный' : 'Неактивен'}
                          </span>
                        </div>
                      </td>
                      
                      {/* Generations */}
                      <td className="h-[72px] px-6">
                        <span className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2]">
                          {user.generations_count || 0}
                        </span>
                      </td>
                      
                      {/* Email */}
                      <td className="h-[72px] px-6">
                        <span className="font-inter font-normal text-[14px] leading-[20px] text-[#a2a2a2]">
                          {user.email || '-'}
                        </span>
                      </td>
                      
                      {/* Role */}
                      <td className="h-[72px] px-6">
                        <div className="inline-flex items-center h-6 px-2 py-0.5 bg-neutral-700 rounded-full">
                          <span className="font-inter font-medium text-[12px] leading-[18px] text-white">
                            {user.role === 'super_admin' ? 'Супер-админ' : user.role === 'admin' ? 'Админ' : 'Пользователь'}
                          </span>
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="h-[72px] px-4">
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
            <div className="px-6 py-4 border-t border-[#252525] flex items-center justify-between bg-[#151515]">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 bg-[#252525] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#303030] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
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
                        : 'text-[#686868] hover:bg-[#1f1f1f]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 bg-[#252525] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#303030] transition-colors"
              >
                <span className="font-inter font-semibold text-[14px] leading-[20px]">Вперед</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Side Sheet Overlay */}
      {selectedUser && (
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
            {/* Close Button - Outside the panel */}
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
                  {selectedUser.email || selectedUser.telegram_username || 'Пользователь'}
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
                        <tr>
                          <td colSpan={3} className="h-[72px] text-center text-[#a2a2a2]">
                            Загрузка...
                          </td>
                        </tr>
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
