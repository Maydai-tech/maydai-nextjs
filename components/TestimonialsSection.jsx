export default function TestimonialsSection() {
  return (
    <section className="py-16 bg-gray-50" id="testimonials">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-primary-dark mb-12">Ils nous font confiance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <img src="#" alt="Avatar client" className="w-16 h-16 rounded-full mb-4 bg-gray-200" />
            <p className="text-gray-700 mb-4">“MaydAI a transformé notre gestion de la conformité IA. L’Audit AI Act est devenu simple et rapide !”</p>
            <span className="font-semibold text-primary">Sophie Martin</span>
            <span className="text-sm text-gray-500">Responsable conformité, HealthTech</span>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <img src="#" alt="Avatar client" className="w-16 h-16 rounded-full mb-4 bg-gray-200" />
            <p className="text-gray-700 mb-4">“L’accompagnement expert de MaydAI pour l’Audit AI Act nous a permis d’anticiper les risques et de rassurer nos clients.”</p>
            <span className="font-semibold text-primary">Jean Dupont</span>
            <span className="text-sm text-gray-500">CTO, FinAI</span>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <img src="#" alt="Avatar client" className="w-16 h-16 rounded-full mb-4 bg-gray-200" />
            <p className="text-gray-700 mb-4">“Une solution intuitive et complète pour l’Audit AI Act. MaydAI est devenu un partenaire clé de notre transformation digitale.”</p>
            <span className="font-semibold text-primary">Claire Dubois</span>
            <span className="text-sm text-gray-500">Directrice Innovation, DataCorp</span>
          </div>
        </div>
      </div>
    </section>
  );
} 