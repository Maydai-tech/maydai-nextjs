'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Pages où on ne veut pas afficher la sidebar
  const noSidebarPages = ['/login', '/signup'];
  const shouldShowSidebar = !noSidebarPages.includes(pathname);

  if (shouldShowSidebar) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen bg-gray-50">
          <div className="p-6 pt-16 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return <div className="min-h-screen bg-white">{children}</div>;
} 