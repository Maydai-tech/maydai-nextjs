import Image from 'next/image';

export default function DashboardSection() {
  return (
    <section className="bg-slate-50 py-12 md:py-16">
      <h2 className="text-3xl font-bold text-primary text-center mb-8">
        Dashboard Registre MaydAI
      </h2>

      <div className="max-w-lg mx-auto px-4 sm:px-6 w-full">
        <Image
          src="/screenshots/dashboard-ai-act.webp"
          alt="Tableau de bord MaydAI - Vue détaillée de l'évaluation des risques et des scores de conformité AI Act"
          width={2021}
          height={2324}
          loading="lazy"
          sizes="(max-width: 512px) 100vw, 512px"
          className="w-full h-auto rounded-2xl overflow-hidden border border-slate-200/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.02)]"
        />
      </div>
    </section>
  );
}
