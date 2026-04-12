'use client'

import Link from 'next/link'
import {
  V3_PILOTAGE_CTA_GROUPS,
  V3_PILOTAGE_ENTRY_SURFACES,
  V3_PILOTAGE_EVENTS,
  V3_PILOTAGE_FUNNEL_SHORT,
  V3_PILOTAGE_GA4_RECIPES,
  V3_PILOTAGE_PRODUCT_DECISIONS,
} from '@/lib/v3-short-path-pilotage'
import { ArrowLeft, BookOpen, LineChart, Route, Table2 } from 'lucide-react'

export default function V3ShortPathPilotagePage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/analytics"
            className="inline-flex items-center text-sm text-[#0080A3] hover:text-[#006280] mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden />
            Retour analytics registre
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LineChart className="h-8 w-8 text-[#0080A3]" aria-hidden />
            Pilotage — parcours court V3
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-3xl leading-relaxed">
            Vue <strong>produit / ops</strong> : les volumes se lisent dans <strong>Google Analytics 4</strong> (événements
            poussés via GTM / <code className="text-xs bg-gray-100 px-1 rounded">dataLayer</code>). Cette page ne se
            connecte pas à GA4 : elle centralise la <strong>cartographie des signaux</strong> et des{' '}
            <strong>recettes d’exploration</strong> pour décider sans refonte BI.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
        <p className="font-semibold text-amber-900 mb-1">Limite volontaire de ce panneau</p>
        <p className="leading-relaxed">
          Aucune agrégation temps réel côté MaydAI : les événements existants ne sont pas persistés en base applicative.
          Pour des tableaux de bord chiffrés, exporter GA4 vers BigQuery ou utiliser les explorations listées ci-dessous.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Table2 className="h-5 w-5 text-[#0080A3]" aria-hidden />
          Vue synthétique — quoi lire où
        </h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="font-medium text-gray-800 mb-2">Entrées court</p>
            <p className="text-gray-600 leading-relaxed">
              Événement <code className="text-xs bg-white px-1 rounded border">v3_short_path_start</code> — dimension{' '}
              <code className="text-xs bg-white px-1 rounded border">entry_surface</code> si mappée depuis le
              dataLayer.
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="font-medium text-gray-800 mb-2">Entrées long (tracées)</p>
            <p className="text-gray-600 leading-relaxed">
              <code className="text-xs bg-white px-1 rounded border">v3_evaluation_entry_surface</code> — filtrer par{' '}
              <code className="text-xs bg-white px-1 rounded border">entry_surface</code>.
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="font-medium text-gray-800 mb-2">Funnel court</p>
            <p className="text-gray-600 leading-relaxed">
              <code className="text-xs bg-white px-1 rounded border">v3_short_path_segment</code> (progression) puis{' '}
              <code className="text-xs bg-white px-1 rounded border">v3_short_path_outcome_view</code> /{' '}
              <code className="text-xs bg-white px-1 rounded border">outcome_result</code>.
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="font-medium text-gray-800 mb-2">Conversion long & partage</p>
            <p className="text-gray-600 leading-relaxed">
              <code className="text-xs bg-white px-1 rounded border">v3_short_path_cta</code> — regroupements{' '}
              <strong>evaluation_long</strong>, exports, <strong>dossier</strong> / <strong>todo</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Catalogue des événements (contrat dataLayer)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 pr-4 font-medium">Événement</th>
                <th className="py-2 pr-4 font-medium">Titre</th>
                <th className="py-2 font-medium">Champs clés</th>
              </tr>
            </thead>
            <tbody>
              {V3_PILOTAGE_EVENTS.map((row) => (
                <tr key={row.event} className="border-b border-gray-100 align-top">
                  <td className="py-3 pr-4">
                    <code className="text-xs bg-teal-50 text-teal-900 px-1.5 py-0.5 rounded">{row.event}</code>
                  </td>
                  <td className="py-3 pr-4 text-gray-800">
                    <span className="font-medium">{row.title}</span>
                    <p className="text-xs text-gray-500 mt-1">{row.when}</p>
                  </td>
                  <td className="py-3 text-gray-600">
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {row.fields.map((f) => (
                        <li key={f.key}>
                          <code className="bg-gray-100 px-1 rounded">{f.key}</code> — {f.description}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Référence détaillée : <code className="bg-gray-100 px-1 rounded">docs/v3-short-path-analytics-events.md</code>{' '}
          dans le dépôt.
        </p>
      </section>

      <section className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Route className="h-5 w-5 text-[#0080A3]" aria-hidden />
          Surfaces d’entrée (<code className="text-sm">entry_surface</code> / <code className="text-sm">entree</code>)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 pr-4 font-medium">Valeur</th>
                <th className="py-2 pr-4 font-medium">Libellé</th>
                <th className="py-2 font-medium">Contexte</th>
              </tr>
            </thead>
            <tbody>
              {V3_PILOTAGE_ENTRY_SURFACES.map((row) => (
                <tr key={row.value} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    <code className="text-xs bg-gray-100 px-1 rounded">{row.value}</code>
                  </td>
                  <td className="py-2 pr-4 text-gray-800">{row.label}</td>
                  <td className="py-2 text-gray-600">{row.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-500 leading-relaxed">
          Dans GA4 : comparer les volumes par <strong>entry_surface</strong> sur les starts court et les ouvertures
          longues tracées pour prioriser les écrans d’orientation (dashboard, synthèse, dossier, header, sortie).
        </p>
      </section>

      <section className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Funnel parcours court (lecture produit)</h2>
        <ol className="space-y-4">
          {V3_PILOTAGE_FUNNEL_SHORT.map((step) => (
            <li key={step.order} className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0080A3] text-white text-sm font-bold flex items-center justify-center">
                {step.order}
              </span>
              <div>
                <p className="font-medium text-gray-900">
                  <code className="text-xs bg-gray-100 px-1 rounded mr-2">{step.event}</code>
                  {step.label}
                </p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{step.productNote}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">CTA <code className="text-sm">v3_short_path_cta</code></h2>
        <p className="text-sm text-gray-600 mb-4">
          Regroupement stable pour filtrer dans GA4 (paramètre <code className="text-xs bg-gray-100 px-1 rounded">cta</code>
          ).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3">
            <p className="font-semibold text-teal-900 mb-1">Conversion vers le long</p>
            <code className="text-xs">{V3_PILOTAGE_CTA_GROUPS.conversionLong.join(', ')}</code>
            <p className="text-xs text-gray-600 mt-2">Croiser avec <code>cta_placement</code> et <code>risk_level</code>.</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="font-semibold text-gray-800 mb-1">Entrée parcours court (CTA)</p>
            <code className="text-xs">{V3_PILOTAGE_CTA_GROUPS.entreeCourt.join(', ')}</code>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="font-semibold text-gray-800 mb-1">Partage & exports</p>
            <code className="text-xs break-all">{V3_PILOTAGE_CTA_GROUPS.partageExport.join(', ')}</code>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="font-semibold text-gray-800 mb-1">Navigation (ex. accès rapides sortie)</p>
            <code className="text-xs break-all">{V3_PILOTAGE_CTA_GROUPS.navigationPostSortie.join(', ')}</code>
            <p className="text-xs text-gray-600 mt-2">
              Filtrer <code>cta_placement = outcome_quick_links</code> pour isoler la grille « Accès rapides ».
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-[#0080A3]" aria-hidden />
          Recettes GA4 (première lecture)
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          À reproduire dans <strong>Explorations</strong> ou rapports personnalisés. Adaptez les noms de dimensions si
          votre conteneur GTM mappe les paramètres du dataLayer différemment.
        </p>
        <div className="space-y-6">
          {V3_PILOTAGE_GA4_RECIPES.map((recipe) => (
            <article
              key={recipe.id}
              className="rounded-lg border border-gray-200 p-4 sm:p-5"
            >
              <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{recipe.objective}</p>
              <p className="text-xs text-gray-500 mt-2">
                Type suggéré : <span className="font-medium">{recipe.explorationType}</span>
              </p>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-medium text-gray-700 mb-1">Dimensions</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {recipe.dimensions.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-1">Métriques</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {recipe.metrics.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Filtres (logique)</p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  {recipe.filters.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-sm text-gray-700 border-t border-gray-100 pt-3 leading-relaxed">
                <span className="font-medium text-gray-900">Lecture : </span>
                {recipe.interpretation}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions produit → indicateurs</h2>
        <ul className="space-y-4">
          {V3_PILOTAGE_PRODUCT_DECISIONS.map((row) => (
            <li key={row.question} className="border-l-4 border-[#0080A3]/40 pl-4">
              <p className="font-medium text-gray-900">{row.question}</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{row.how}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
