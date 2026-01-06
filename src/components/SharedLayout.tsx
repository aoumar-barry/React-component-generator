'use client';

import { ReactNode } from 'react';
import SidebarMenu from './SidebarMenu';
import { SidebarProvider } from '@/contexts/SidebarContext';

interface SharedLayoutProps {
  children: ReactNode;
}

export default function SharedLayout({ children }: SharedLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#1a1a1a] overflow-hidden">
        <SidebarMenu />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

