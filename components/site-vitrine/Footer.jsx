import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image 
            src="/logos/logo-maydai/claim-maydai.png" 
            alt="MaydAI Claim" 
            width={180} 
            height={56}
            className="h-14 w-auto" 
          />
        </div>
        <nav className="flex flex-wrap justify-center gap-4 md:gap-6 text-gray-500 text-sm">
          <a href="/securite" className="hover:text-primary">Sécurité</a>
          <a href="/fonctionnalites" className="hover:text-primary">Fonctionnalités</a>
          <a href="/tarifs" className="hover:text-primary">Tarifs</a>
          <a href="/a-propos" className="hover:text-primary">À propos</a>
          <a href="/contact" className="hover:text-primary">Contact</a>
          <a href="/politique-confidentialite" className="hover:text-primary">Confidentialité</a>
          <a href="/conditions-generales" className="hover:text-primary">CGU</a>
        </nav>
        <div className="flex flex-col items-center md:items-end gap-2">
          <div className="flex items-center gap-2 text-gray-500 text-xs bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <Image 
              src="/icons_sec/FR_Hosting.webp" 
              alt="Hébergé en France" 
              width={16} 
              height={16}
              className="w-4 h-4" 
            />
            <span>Hébergé en France - Sécurisé par OVHcloud</span>
          </div>
          <div className="text-gray-400 text-xs">© {new Date().getFullYear()} MaydAI. Tous droits réservés.</div>
        </div>
      </div>
    </footer>
  );
} 