"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { user, loading } = useAuth();
  const [isIaActMenuOpen, setIsIaActMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsIaActMenuOpen(false);
      }
      // Verifier que le clic n'est pas sur le bouton burger lui-meme
      const burgerButton = (event.target as HTMLElement).closest('[data-mobile-menu-button]');
      if (!burgerButton && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleButtonHover = (e: MouseEvent<HTMLAnchorElement>, color: string) => {
    (e.target as HTMLAnchorElement).style.backgroundColor = color;
  };

  return (
    <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-30">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/logos/logo-maydai/logo-maydai-complet.png"
            alt="MaydAI Logo"
            width={134}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <ul className="hidden md:flex gap-8 items-center text-gray-700 font-medium">
          <li className="relative" ref={menuRef}>
            <button
              onClick={() => setIsIaActMenuOpen(!isIaActMenuOpen)}
              className="flex items-center hover:text-primary transition"
            >
              IA Act
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isIaActMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <Link
                  href="/ia-act-ue"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition"
                  onClick={() => setIsIaActMenuOpen(false)}
                >
                  <Image src="/icons/eye.png" alt="Oeil" width={16} height={16} className="w-4 h-4" />
                  Vue d&apos;ensemble
                </Link>
                <Link
                  href="/ia-act-ue/calendrier"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition"
                  onClick={() => setIsIaActMenuOpen(false)}
                >
                  <Image src="/icons/calendar.png" alt="Calendrier" width={16} height={16} className="w-4 h-4" />
                  Calendrier IA Act
                </Link>
                <Link
                  href="/ia-act-ue/risques"
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition"
                  onClick={() => setIsIaActMenuOpen(false)}
                >
                  <Image src="/icons/caution-1.png" alt="Attention" width={16} height={16} className="w-4 h-4" />
                  Pyramide risques IA
                </Link>
              </div>
            )}
          </li>
          <li><Link href="/fonctionnalites" className="hover:text-primary transition">Fonctionnalites</Link></li>
          <li><Link href="/securite" className="hover:text-primary transition">Sécurité</Link></li>
          <li><Link href="/tarifs" className="hover:text-primary transition">Tarifs</Link></li>
          <li><Link href="/a-propos" className="hover:text-primary transition">A propos</Link></li>
          <li><Link href="/contact" className="hover:text-primary transition">Contact</Link></li>
        </ul>

        <div className="hidden md:flex gap-2 items-center">
          {!loading && user ? (
            <Link
              href="/dashboard/registries"
              className="px-5 py-2 rounded-lg font-semibold shadow transition text-white"
              style={{ backgroundColor: '#ffab5a' }}
              onMouseEnter={(e) => handleButtonHover(e, '#e6995a')}
              onMouseLeave={(e) => handleButtonHover(e, '#ffab5a')}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-5 py-2 rounded-lg font-normal text-sm transition text-primary">Connexion</Link>
              <Link
                href="/signup"
                className="px-5 py-2 rounded-lg font-semibold shadow transition text-white"
                style={{ backgroundColor: '#ffab5a' }}
                onMouseEnter={(e) => handleButtonHover(e, '#e6995a')}
                onMouseLeave={(e) => handleButtonHover(e, '#ffab5a')}
              >
                Commencer
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition"
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileMenuOpen(!isMobileMenuOpen);
          }}
          data-mobile-menu-button
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden bg-white border-t border-gray-100 shadow-lg"
        >
          <div className="px-4 py-4 space-y-4">
            {/* IA Act submenu for mobile */}
            <div className="space-y-2">
              <div className="font-medium text-gray-900 px-2 py-1">IA Act</div>
              <Link
                href="/ia-act-ue"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image src="/icons/eye.png" alt="Oeil" width={16} height={16} className="w-4 h-4" />
                Vue d&apos;ensemble
              </Link>
              <Link
                href="/ia-act-ue/calendrier"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image src="/icons/calendar.png" alt="Calendrier" width={16} height={16} className="w-4 h-4" />
                Calendrier IA Act
              </Link>
              <Link
                href="/ia-act-ue/risques"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Image src="/icons/caution-1.png" alt="Attention" width={16} height={16} className="w-4 h-4" />
                Pyramide risques IA
              </Link>
            </div>

            <hr className="border-gray-200" />

            {/* Other menu items */}
            <div className="space-y-2">
              <Link
                href="/fonctionnalites"
                className="block px-2 py-2 text-gray-700 hover:text-primary transition rounded-lg hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Fonctionnalites
              </Link>
              <Link
                href="/securite"
                className="block px-2 py-2 text-gray-700 hover:text-primary transition rounded-lg hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sécurité
              </Link>
              <Link
                href="/tarifs"
                className="block px-2 py-2 text-gray-700 hover:text-primary transition rounded-lg hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tarifs
              </Link>
              <Link
                href="/a-propos"
                className="block px-2 py-2 text-gray-700 hover:text-primary transition rounded-lg hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                A propos
              </Link>
              <Link
                href="/contact"
                className="block px-2 py-2 text-gray-700 hover:text-primary transition rounded-lg hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
            </div>

            <hr className="border-gray-200" />

            {/* CTA button for mobile */}
            <div className="pt-2">
              {!loading && user ? (
                <Link
                  href="/dashboard/registries"
                  className="block w-full px-5 py-3 rounded-lg font-semibold shadow transition text-center text-white"
                  style={{ backgroundColor: '#ffab5a' }}
                  onMouseEnter={(e) => handleButtonHover(e, '#e6995a')}
                  onMouseLeave={(e) => handleButtonHover(e, '#ffab5a')}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full px-5 py-3 rounded-lg font-normal text-center text-primary mb-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full px-5 py-3 rounded-lg font-semibold shadow transition text-center text-white"
                    style={{ backgroundColor: '#ffab5a' }}
                    onMouseEnter={(e) => handleButtonHover(e, '#e6995a')}
                    onMouseLeave={(e) => handleButtonHover(e, '#ffab5a')}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Commencer
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
