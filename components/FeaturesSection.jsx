import Image from 'next/image';

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: '#0080a3' }}>Les Principales Fonctionnalités de la Plateforme MaydAI :</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition">
            <Image src="/icons/dashboard.png" alt="Registre IA Act" width={64} height={64} className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Le Registre IA Act : votre tableau de bord de conformité</h3>
            <p className="text-gray-600">Visualisez l&apos;état de conformité de tous vos projets IA en temps réel et identifiez les axes d&apos;amélioration.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition">
            <Image src="/icons/case.png" alt="Audits IA Act" width={64} height={64} className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Audits IA Act : un accompagnement sur mesure</h3>
            <p className="text-gray-600">Générez des rapports d&apos;audit conformes à l&apos;AI Act en quelques clics grâce au mode collaboratif de la plateforme. Suivez les étapes de réalisation jusqu&apos;à sa validation.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl shadow hover:shadow-lg transition">
            <Image src="/icons/lawyer.png" alt="Expertise AI Act : Technique et Juridique" width={64} height={64} className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Expertise AI Act : Technique et Juridique</h3>
            <p className="text-gray-600">Décryptez les subtilités de l&apos;AI Act avec des conseils personnalisés et opérants. Notre double compétence, à la fois technique et juridique, vous apporte des réponses claires pour sécuriser chaque étape de votre démarche de conformité.</p>
          </div>
        </div>
      </div>
    </section>
  );
} 