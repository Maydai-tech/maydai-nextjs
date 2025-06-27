'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  // Sidebar désactivée - retour du layout simple pour toutes les pages
  return <div className="min-h-screen bg-white">{children}</div>;
} 