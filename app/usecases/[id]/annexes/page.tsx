"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'

export default function UseCaseAnnexesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  const { useCase, loading: loadingData, error } = useUseCaseData(useCaseId)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  if (!mounted || loading) {
    return <UseCaseLoader />
  }

  if (!user) {
    return null
  }

  if (loadingData) {
    return <UseCaseLoader message="Chargement du cas d'usage..." />
  }

  if (error || !useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cas d'usage non trouvé</h1>
          <p className="text-gray-600 mb-4">
            {error || "Le cas d'usage que vous recherchez n'existe pas ou vous n'y avez pas accès."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <UseCaseLayout useCase={useCase}>
      <div className="space-y-6 sm:space-y-8">
        {/* 8. Impact Environnemental */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <div className="flex items-center mb-6">
            <img 
              src="/icons/feuille.png" 
              alt="Impact environnemental" 
              width={24} 
              height={24} 
              className="mr-3"
            />
            <h2 className="text-xl font-semibold text-gray-900">8. Impact Environnemental</h2>
          </div>
          <p className="text-base leading-relaxed text-gray-800 mb-8">
            Les critères suivants sont intégrés aux demandes de transparence de l'AI Act mais ne sont pas encore transmises par les technologies concernées :
          </p>

          <div className="space-y-8">
            <div className="flex items-start">
              <img 
                src="/icons/app.png" 
                alt="Nombre de GPUs" 
                width={20} 
                height={20} 
                className="mr-3 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nombre de GPUs</h3>
                <p className="text-gray-800 leading-relaxed">
                Nombre total d'unités de traitement graphique (GPU) utilisées pour entraîner le modèle d'IA. Les GPUs sont des composants très puissants mais aussi très énergivores. Plus on en utilise, plus la consommation d'énergie globale augmente de manière significative. C'est un multiplicateur direct de la consommation électrique.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <img 
                src="/icons/low-performance.png" 
                alt="Consommation électrique par GPU" 
                width={20} 
                height={20} 
                className="mr-3 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Consommation électrique par GPU</h3>
                <p className="text-gray-800 leading-relaxed">
                Puissance électrique moyenne consommée par un seul GPU pendant l'entraînement, généralement mesurée en Watts (W). Toutes les puces graphiques ne se valent pas. Un GPU de dernière génération très performant peut consommer beaucoup plus qu'un modèle plus ancien. Cette valeur permet d'affiner le calcul de la consommation totale.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <img 
                src="/icons/level-up.png" 
                alt="Temps d'entraînement" 
                width={20} 
                height={20} 
                className="mr-3 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Temps d'entraînement</h3>
                <p className="text-gray-800 leading-relaxed">
                Durée totale nécessaire pour entraîner le modèle, souvent exprimée en heures. Il s'agit du facteur "temps" car même avec peu de GPUs peu gourmands, un entraînement qui dure des semaines ou des mois aura un impact énergétique plus important.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <img 
                src="/icons/ecosystem.png" 
                alt="Intensité carbone du datacenter" 
                width={20} 
                height={20} 
                className="mr-3 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Intensité carbone du datacenter</h3>
                <p className="text-gray-800 leading-relaxed">
                Mesure qui indique la quantité de dioxyde de carbone (CO2) émise pour produire une unité d'énergie (par exemple, en grammes de CO2 par kilowatt-heure, gCO2eq/kWh). Cette valeur dépend de la localisation géographique du datacenter et de son mix énergétique (nucléaire, charbon, solaire, éolien, etc.). C'est le critère clé pour passer de la consommation d'énergie à l'empreinte carbone. Entraîner un modèle dans un datacenter alimenté par des énergies renouvelables en Suède aura un impact carbone bien plus faible que de l'entraîner dans un datacenter qui dépend du charbon en Pologne, même si la consommation d'énergie est identique.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 9. Références Légales Clés */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <div className="flex items-center mb-6">
            <img 
              src="/icons/democracy-monument.png" 
              alt="Règlement AI Act" 
              width={24} 
              height={24} 
              className="mr-3"
            />
            <h2 className="text-xl font-semibold text-gray-900">9. Références Légales Clés</h2>
          </div>
          <p className="text-base leading-relaxed text-gray-800 mb-6">
            Règlement AI Act : règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 (l'AI Act).
          </p>

          <div className="prose prose-gray max-w-none">
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li><span className="font-semibold">Article 5</span> — Pratiques d'IA interdites.</li>
              <li><span className="font-semibold">Chapitre III, Section 2</span> — Exigences applicables aux systèmes d'IA à haut risque.</li>
              <li><span className="font-semibold">Article 9</span> — Système de gestion des risques.</li>
              <li><span className="font-semibold">Article 10</span> — Gouvernance des données.</li>
              <li><span className="font-semibold">Article 11</span> — Documentation technique.</li>
              <li><span className="font-semibold">Article 12</span> — Enregistrement (journaux).</li>
              <li><span className="font-semibold">Article 13</span> — Transparence et fourniture d'informations aux déployeurs.</li>
              <li><span className="font-semibold">Article 14</span> — Contrôle humain.</li>
              <li><span className="font-semibold">Article 15</span> — Exactitude, robustesse et cybersécurité.</li>
              <li><span className="font-semibold">Article 17</span> — Système de gestion de la qualité.</li>
              <li><span className="font-semibold">Article 26</span> — Obligations incombant aux déployeurs de systèmes d'IA à haut risque.</li>
              <li><span className="font-semibold">Article 27</span> — Analyse d'impact des systèmes d'IA à haut risque sur les droits fondamentaux.</li>
              <li><span className="font-semibold">Article 49</span> — Enregistrement dans la base de données de l'UE.</li>
              <li><span className="font-semibold">Article 50</span> — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA.</li>
              <li><span className="font-semibold">Article 51</span> — Classification de modèles d'IA à usage général en tant que modèles d'IA à usage général présentant un risque systémique.</li>
              <li><span className="font-semibold">Article 53</span> — Obligations des fournisseurs de modèles d'IA à usage général.</li>
              <li><span className="font-semibold">Article 55</span> — Obligations des fournisseurs de modèles d'IA à usage général présentant un risque systémique.</li>
              <li><span className="font-semibold">Article 56</span> — Codes de bonne pratique pour les GPAI.</li>
              <li><span className="font-semibold">Article 57</span> — Bacs à sable réglementaires de l'IA.</li>
              <li><span className="font-semibold">Article 60</span> — Essais en conditions réelles.</li>
              <li><span className="font-semibold">Article 72</span> — Surveillance après commercialisation.</li>
              <li><span className="font-semibold">Article 73</span> — Signalement d'incidents graves.</li>
              <li><span className="font-semibold">Article 99</span> — Sanctions administratives.</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Annexes</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li><span className="font-semibold">Annexe III</span> : Liste des systèmes d'IA à haut risque.</li>
              <li><span className="font-semibold">Annexe IV</span> : Documentation technique pour les systèmes d'IA à haut risque.</li>
              <li><span className="font-semibold">Annexe XI</span> : Documentation technique pour les fournisseurs de modèles d'IA à usage général.</li>
            </ul>
          </div>
        </div>
      </div>
    </UseCaseLayout>
  )
}


