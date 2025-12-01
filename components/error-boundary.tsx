'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#101010] p-4">
          <div className="max-w-md w-full bg-[#131313] rounded-2xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-inter font-semibold text-xl text-white mb-2">
              Что-то пошло не так
            </h2>
            <p className="font-inter text-sm text-[#959595] mb-4">
              Произошла ошибка при загрузке страницы. Пожалуйста, попробуйте обновить страницу.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full h-10 rounded-xl bg-white font-inter font-medium text-sm text-black hover:bg-gray-200 transition-colors"
              >
                Обновить страницу
              </button>
              <button
                onClick={() => {
                  // Clear any cached data that might be causing issues
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch (e) {
                    // Ignore if storage is not available
                  }
                  window.location.href = '/login';
                }}
                className="w-full h-10 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white hover:bg-[#1f1f1f] transition-colors"
              >
                Очистить кеш и войти заново
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}



