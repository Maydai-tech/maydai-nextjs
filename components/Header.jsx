import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-30">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="MaydAI Logo" className="h-8 w-8" />
          <span className="font-bold text-xl text-primary">MaydAI</span>
        </div>
        <ul className="hidden md:flex gap-8 items-center text-gray-700 font-medium">
          <li><Link href="#features" className="hover:text-primary transition">Fonctionnalités</Link></li>
          <li><Link href="#pricing" className="hover:text-primary transition">Tarifs</Link></li>
          <li><Link href="#about" className="hover:text-primary transition">À propos</Link></li>
          <li><Link href="#contact" className="hover:text-primary transition">Contact</Link></li>
        </ul>
        <div className="hidden md:block">
          <Link href="/login" className="bg-primary text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-primary-dark transition">Commencer</Link>
        </div>
        {/* Mobile menu button (à implémenter si besoin) */}
      </nav>
    </header>
  );
} 