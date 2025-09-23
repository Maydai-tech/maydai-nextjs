'use client'

import Link from 'next/link'
import Image from 'next/image'
import ProfileDropdown from './ProfileDropdown'

interface NavBarProps {
  showLogo?: boolean
  logoHref?: string
  showProfileDropdown?: boolean
  className?: string
}

export default function NavBar({
  showLogo = true,
  logoHref = "/",
  showProfileDropdown = true,
  className = ""
}: NavBarProps) {
  return (
    <header className={`w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-30 ${className}`}>
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        {showLogo && (
          <Link href={logoHref} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/logos/logo-maydai/logo-maydai-complet.png"
              alt="MaydAI Logo"
              width={134}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
        )}
        {showProfileDropdown && <ProfileDropdown />}
      </nav>
    </header>
  )
}