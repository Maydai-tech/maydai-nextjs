import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

export default function MethodologySection() {
  return (
    <section
      aria-labelledby="methodology-heading"
      className="max-w-4xl mx-auto py-12 space-y-8 text-slate-800 dark:text-slate-200"
    >
      <h2
        id="methodology-heading"
        className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100"
      >
        Méthodologie d&apos;évaluation par EcoLogits
      </h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-900 dark:text-slate-100">
            L&apos;approche scientifique : l&apos;Analyse du Cycle de Vie (ACV)
          </h3>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            Pour garantir des mesures fiables, cette évaluation s&apos;appuie sur la méthodologie
            open-source EcoLogits, encadrée par l&apos;Analyse du Cycle de Vie (ACV) selon la norme
            ISO 14044.
          </p>
          <ul className="mt-4 space-y-3 list-disc pl-6 text-slate-700 dark:text-slate-300 leading-relaxed">
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Modélisation ascendante (Bottom-up)
              </strong>
              {' : '}
              Au lieu de faire des estimations globales, la méthodologie calcule et agrège
              l&apos;impact environnemental de chaque composant individuel du service utilisé.
            </li>
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Périmètre strict
              </strong>
              {' : '}
              L&apos;évaluation se concentre sur les tâches d&apos;inférence de l&apos;IA (la
              génération de réponses) et l&apos;hébergement dans les data centers (calcul et
              refroidissement). L&apos;entraînement des modèles et les terminaux utilisateurs sont
              exclus.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-900 dark:text-slate-100">
            Les 4 indicateurs d&apos;impact mesurés
          </h3>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            L&apos;impact d&apos;une IA ne se limite pas à sa consommation électrique. L&apos;évaluation
            porte sur quatre critères majeurs :
          </p>
          <ul className="mt-4 space-y-3 list-disc pl-6 text-slate-700 dark:text-slate-300 leading-relaxed">
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Réchauffement climatique (GWP)
              </strong>
              {' : '}
              Émissions de gaz à effet de serre (équivalents CO2).
            </li>
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Épuisement des ressources (ADPe)
              </strong>
              {' : '}
              Consommation de minéraux et métaux bruts (équivalents antimoine) liés à la fabrication
              du matériel.
            </li>
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Énergie primaire (PE)
              </strong>
              {' : '}
              Énergie consommée à partir de sources naturelles (exprimée en mégajoules).
            </li>
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Empreinte Eau (WCF)
              </strong>
              {' : '}
              Quantité d&apos;eau consommée par les centres de données pour le refroidissement et
              non restituée à sa source.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-900 dark:text-slate-100">
            Précision technique et conditions réelles
          </h3>
          <ul className="space-y-3 list-disc pl-6 text-slate-700 dark:text-slate-300 leading-relaxed">
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Estimation de la latence
              </strong>
              {' : '}
              Le calcul énergétique inclut le Time-to-first-token (TTFT, pré-remplissage) et le
              débit (Throughput, phase de décodage).
            </li>
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                Matériel de dernière génération
              </strong>
              {' : '}
              Les référentiels EcoLogits simulent des environnements de production modernes utilisant
              des serveurs optimisés (GPU H100, moteurs d&apos;inférence vLLM).
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <Image
            src="/logos/logo-institut/logo_light.png"
            alt="Logo de l'institut EcoLogits"
            width={160}
            height={32}
            className="h-8 w-auto object-contain"
          />
          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-1">
              Découvrez en détail l&apos;Analyse du Cycle de Vie (ACV) des modèles d&apos;IA.
            </p>
            <a
              href="https://ecologits.ai/latest/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0080A3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2 rounded-sm transition-colors"
            >
              Consulter la documentation officielle sur ecologits.ai
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
