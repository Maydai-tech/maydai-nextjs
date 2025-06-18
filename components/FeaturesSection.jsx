export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary-dark">Fonctionnalités principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition">
            <img src="#" alt="Audit automatisé" className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Audit AI Act automatisé</h3>
            <p className="text-gray-600">Générez des rapports d'audit conformes à l'AI Act en quelques clics grâce à notre technologie intelligente.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition">
            <img src="#" alt="Tableau de bord conformité" className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tableau de bord de conformité</h3>
            <p className="text-gray-600">Visualisez l'état de conformité de tous vos projets IA en temps réel et identifiez les axes d'amélioration.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition">
            <img src="#" alt="Support expert" className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Accompagnement expert</h3>
            <p className="text-gray-600">Bénéficiez de conseils personnalisés pour chaque étape de votre démarche de conformité à l'AI Act.</p>
          </div>
        </div>
      </div>
    </section>
  );
} 