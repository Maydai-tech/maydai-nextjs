'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useCleanupBrowserExtensions } from '@/hooks/useCleanupBrowserExtensions';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Nettoyer les attributs ajoutés par les extensions navigateur
  useCleanupBrowserExtensions();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pages qui nécessitent la sidebar (pages SaaS connectées)
  const sidebarPages = [
    '/dashboard',
    '/profil',
    '/usecases',
    '/companies',
    '/admin'
  ];

  // Pages à exclure de la sidebar même si elles commencent par un préfixe autorisé
  const excludedPages = [
    '/dashboard/companies'
  ];

  // Vérifier si c'est une page qui nécessite la sidebar
  const needsSidebar = sidebarPages.some(page => pathname.startsWith(page)) && 
                       !excludedPages.some(page => pathname === page);

  // Pendant le chargement initial ou avant le montage, afficher le layout simple
  if (!mounted || loading) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  // Après le montage, vérifier si l'utilisateur est connecté et sur une page SaaS
  if (needsSidebar && user) {
    // Layout avec sidebar pour les pages SaaS
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64">
          <main className="min-h-screen p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Layout simple sans header/footer pour toutes les autres pages
  return <div className="min-h-screen bg-white">{children}</div>;
} 