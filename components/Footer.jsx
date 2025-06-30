export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/logos/logo-maydai/claim-maydai.png" alt="MaydAI Claim" className="h-14 w-auto" />
        </div>
        <nav className="flex gap-6 text-gray-500 text-sm">
          <a href="#features" className="hover:text-primary">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-primary">Tarifs</a>
          <a href="/a-propos" className="hover:text-primary">À propos</a>
          <a href="/contact" className="hover:text-primary">Contact</a>
          <a href="/politique-confidentialite" className="hover:text-primary">Confidentialité</a>
          <a href="/conditions-generales" className="hover:text-primary">CGU</a>
        </nav>
        <div className="text-gray-400 text-xs">© {new Date().getFullYear()} MaydAI. Tous droits réservés.</div>
      </div>
    </footer>
  );
} 