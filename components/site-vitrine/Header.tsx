"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useAuth } from '@/lib/auth';
import {
  MARKETING_HEADER_NAVIGATION,
  MARKETING_HEADER_CTAS,
  isMarketingNavDropdown,
  type MarketingHeaderCta,
  type MarketingNavLink,
} from '@/config/marketing-navigation';

const CHEVRON_ICON = (
  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

function NavDropdownChildLink({
  child,
  className,
  onNavigate,
}: {
  child: MarketingNavLink;
  className: string;
  onNavigate: () => void;
}) {
  return (
    <Link href={child.href} className={className} onClick={onNavigate}>
      {child.icon && (
        <Image
          src={child.icon.src}
          alt={child.icon.alt}
          width={16}
          height={16}
          className="w-4 h-4"
        />
      )}
      {child.label}
    </Link>
  );
}

function HeaderCtaLink({
  cta,
  layout,
  onNavigate,
  onButtonHover,
}: {
  cta: MarketingHeaderCta;
  layout: 'desktop' | 'mobile';
  onNavigate?: () => void;
  onButtonHover: (e: MouseEvent<HTMLAnchorElement>, color: string) => void;
}) {
  if (cta.variant === 'primary') {
    const baseClass =
      layout === 'desktop'
        ? 'px-5 py-2 rounded-lg font-semibold shadow transition text-white'
        : 'block w-full px-5 py-3 rounded-lg font-semibold shadow transition text-center text-white';

    return (
      <Link
        href={cta.href}
        className={baseClass}
        style={{ backgroundColor: '#ffab5a' }}
        onMouseEnter={(e) => onButtonHover(e, '#e6995a')}
        onMouseLeave={(e) => onButtonHover(e, '#ffab5a')}
        onClick={onNavigate}
      >
        {cta.label}
      </Link>
    );
  }

  const baseClass =
    layout === 'desktop'
      ? 'px-5 py-2 rounded-lg font-normal text-sm transition text-primary'
      : 'block w-full px-5 py-3 rounded-lg font-normal text-center text-primary mb-2';

  return (
    <Link href={cta.href} className={baseClass} onClick={onNavigate}>
      {cta.label}
    </Link>
  );
}

export default function Header() {
  const { user, loading } = useAuth();
  const [openDropdownLabel, setOpenDropdownLabel] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const desktopNavRef = useRef<HTMLUListElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (desktopNavRef.current && !desktopNavRef.current.contains(event.target as Node)) {
        setOpenDropdownLabel(null);
      }
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

  const closeDropdown = () => setOpenDropdownLabel(null);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const headerCtas =
    !loading && user
      ? MARKETING_HEADER_CTAS.authenticated
      : MARKETING_HEADER_CTAS.unauthenticated;

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
        <ul
          ref={desktopNavRef}
          className="hidden md:flex gap-8 items-center text-gray-700 font-medium"
        >
          {MARKETING_HEADER_NAVIGATION.map((item) => {
            if (isMarketingNavDropdown(item)) {
              const isOpen = openDropdownLabel === item.label;

              return (
                <li key={item.label} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdownLabel(isOpen ? null : item.label)
                    }
                    className="flex items-center hover:text-primary transition"
                  >
                    {item.label}
                    {CHEVRON_ICON}
                  </button>
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {item.children.map((child) => (
                        <NavDropdownChildLink
                          key={child.href}
                          child={child}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition"
                          onNavigate={closeDropdown}
                        />
                      ))}
                    </div>
                  )}
                </li>
              );
            }

            return (
              <li key={item.label}>
                <Link href={item.href} className="hover:text-primary transition">
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:flex gap-2 items-center">
          {headerCtas.map((cta) => (
            <HeaderCtaLink
              key={cta.label}
              cta={cta}
              layout="desktop"
              onButtonHover={handleButtonHover}
            />
          ))}
        </div>

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

      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden bg-white border-t border-gray-100 shadow-lg"
        >
          <div className="px-4 py-4 space-y-4">
            {MARKETING_HEADER_NAVIGATION.map((item) => {
              if (isMarketingNavDropdown(item)) {
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="font-medium text-gray-900 px-2 py-1">{item.label}</div>
                    {item.children.map((child) => (
                      <NavDropdownChildLink
                        key={child.href}
                        child={child}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition rounded-lg"
                        onNavigate={closeMobileMenu}
                      />
                    ))}
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block px-2 py-2 text-gray-700 hover:text-primary transition rounded-lg hover:bg-gray-50"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              );
            })}

            <hr className="border-gray-200" />

            <div className="pt-2">
              {headerCtas.map((cta) => (
                <HeaderCtaLink
                  key={cta.label}
                  cta={cta}
                  layout="mobile"
                  onNavigate={closeMobileMenu}
                  onButtonHover={handleButtonHover}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
