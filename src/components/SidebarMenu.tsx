'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    id: 'component-generator',
    label: 'Component Generator',
    path: '/',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'unit-test-generator',
    label: 'Unit Test Generator',
    path: '/unit-test-generator',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'tool-3',
    label: 'Tool 3',
    path: '/tool-3',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'tool-4',
    label: 'Tool 4',
    path: '/tool-4',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'tool-5',
    label: 'Tool 5',
    path: '/tool-5',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

export default function SidebarMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);

  useEffect(() => {
    setMounted(true);
    // After first render, mark as no longer initial mount
    const timer = setTimeout(() => {
      setIsInitialMount(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // During SSR and initial render, use default collapsed state to match server
  const displayCollapsed = mounted ? isCollapsed : true;

  return (
    <div
      className={`bg-[#2a2a2a] border-r border-[#3a3a3a] ${
        isInitialMount ? '' : 'transition-all duration-300'
      } ${displayCollapsed ? 'w-16' : 'w-64'} flex flex-col h-screen`}
      suppressHydrationWarning
    >
      {/* Header */}
      <div className="p-4 border-b border-[#3a3a3a] flex items-center justify-between">
        {!displayCollapsed && (
          <h2 className="text-white font-semibold text-lg">AI Toolkit</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-[#3a3a3a] transition-colors text-gray-400 hover:text-white"
          title={displayCollapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${displayCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            suppressHydrationWarning
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#3a8bfd] text-white'
                      : 'text-gray-400 hover:bg-[#3a3a3a] hover:text-white'
                  }`}
                  title={displayCollapsed ? item.label : ''}
                >
                  <span className={displayCollapsed ? 'mx-auto' : ''}>{item.icon}</span>
                  {!displayCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

