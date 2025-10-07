'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, User, CreditCard, Menu, X, Users, FileText, CheckSquare, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useApiCall } from '@/lib/api-client-legacy';
import packageJson from '../package.json';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const api = useApiCall();

  // Fetch company ID when user is available
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (user) {
        try {
          const result = await api.get('/api/companies');
          
          if (result.data && result.data.length > 0) {
            // Since users currently have only one company, take the first one
            setCompanyId(result.data[0].id);
          }
        } catch (error) {
          console.error('Error fetching company ID:', error);
        }
      }
    };

    fetchCompanyId();
  }, [user, api]);

  // Determine dashboard URL based on current context
  const getDashboardUrl = () => {
    // If we're currently on a company dashboard page, extract the company ID from the URL
    const dashboardMatch = pathname.match(/^\/dashboard\/([^\/]+)/);
    if (dashboardMatch && dashboardMatch[1] !== 'companies') {
      return `/dashboard/${dashboardMatch[1]}`;
    }

    // If we have a company ID from the API, use it
    if (companyId) {
      return `/dashboard/${companyId}`;
    }

    // Fallback to company selection page
    return '/dashboard/registries';
  };

  // Determine collaboration URL based on current context
  const getCollaborationUrl = () => {
    // If we're currently on a company dashboard page, extract the company ID from the URL
    const dashboardMatch = pathname.match(/^\/dashboard\/([^\/]+)/);
    if (dashboardMatch && dashboardMatch[1] !== 'companies' && dashboardMatch[1] !== 'registries') {
      return `/dashboard/${dashboardMatch[1]}/collaboration`;
    }

    // If we have a company ID from the API, use it
    if (companyId) {
      return `/dashboard/${companyId}/collaboration`;
    }

    // Fallback to company selection page
    return '/dashboard/registries';
  };

  const menuItems = [
    {
      name: 'Dashboard',
      href: getDashboardUrl(),
      icon: Home
    },
    {
      name: 'Dossiers',
      href: '/dossiers',
      icon: FileText
    },
    {
      name: 'To-do List',
      href: '/todo-list',
      icon: CheckSquare
    },
    {
      name: 'Collaboration',
      href: getCollaborationUrl(),
      icon: Users
    },
    {
      name: 'Abonnement',
      href: '/abonnement',
      icon: CreditCard
    }
  ];

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Burger Menu Button - Mobile/Tablet Only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-60 bg-[#0080A3] text-white p-2 rounded-lg shadow-lg hover:bg-[#006280] transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay - Mobile/Tablet Only */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-[#0080A3] h-screen w-64 fixed left-0 top-0 z-40 flex flex-col shadow-xl transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-[#006280]/30">
          <h1 className="text-white text-xl font-bold tracking-wide">MaydAI</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Dashboard should be highlighted when on dashboard pages or usecase pages
            // Dossiers should be highlighted when on dossiers pages
            // Collaboration should be highlighted when on collaboration pages
            const isActive = item.name === 'Dashboard'
              ? (pathname === item.href || pathname.startsWith('/usecases/'))
              : item.name === 'Dossiers'
              ? pathname.startsWith('/dossiers')
              : item.name === 'Collaboration'
              ? pathname.includes('/collaboration')
              : pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-white text-[#0080A3] shadow-lg font-medium' 
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }
                `}
                onClick={() => setIsOpen(false)}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#0080A3]' : 'text-white/90 group-hover:text-white'}`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-[#006280]/30">
          <Link
            href="/settings"
            className={`
              flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group mb-4
              ${pathname === '/settings'
                ? 'bg-white text-[#0080A3] shadow-lg font-medium'
                : 'text-white/90 hover:bg-white/10 hover:text-white'
              }
            `}
            onClick={() => setIsOpen(false)}
          >
            <Settings className={`w-5 h-5 ${pathname === '/settings' ? 'text-[#0080A3]' : 'text-white/90 group-hover:text-white'}`} />
            <span className="font-medium">Paramètres</span>
          </Link>

        </div>
      </div>
    </>
  );
} 