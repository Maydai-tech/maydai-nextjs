'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home
    },
    {
      name: 'Profil',
      href: '/profil',
      icon: User
    }
  ];

  return (
    <div className="bg-[#0080A3] h-screen w-64 fixed left-0 top-0 z-40 flex flex-col shadow-xl">
      <div className="p-6 border-b border-[#006280]/30">
        <h1 className="text-white text-xl font-bold tracking-wide">Maydai Admin</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
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
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#0080A3]' : 'text-white/90 group-hover:text-white'}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-[#006280]/30">
        <div className="text-center text-white/60 text-xs">
          Maydai v1.0
        </div>
      </div>
    </div>
  );
} 