'use client'

import React from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps'

interface WorldMapProps {
  deploymentCountries: string[]
  className?: string
}

const WorldMap: React.FC<WorldMapProps> = ({ deploymentCountries, className = "" }) => {
  // Map country names to ISO codes for proper matching
  const countryMapping: { [key: string]: string } = {
    'France': 'FRA',
    'USA': 'USA',
    'United States': 'USA',
    'États-Unis': 'USA',
    'Etats-Unis': 'USA',
    'Canada': 'CAN',
    'Royaume-Uni': 'GBR',
    'United Kingdom': 'GBR',
    'UK': 'GBR',
    'Allemagne': 'DEU',
    'Germany': 'DEU',
    'Espagne': 'ESP',
    'Spain': 'ESP',
    'Italie': 'ITA',
    'Italy': 'ITA',
    'Australie': 'AUS',
    'Australia': 'AUS',
    'Japon': 'JPN',
    'Japan': 'JPN',
    'Chine': 'CHN',
    'China': 'CHN',
    'Inde': 'IND',
    'India': 'IND',
    'Brésil': 'BRA',
    'Brazil': 'BRA',
    'Mexique': 'MEX',
    'Mexico': 'MEX',
    'Pays-Bas': 'NLD',
    'Netherlands': 'NLD',
    'Belgique': 'BEL',
    'Belgium': 'BEL',
    'Suisse': 'CHE',
    'Switzerland': 'CHE',
    'Suède': 'SWE',
    'Sweden': 'SWE',
    'Norvège': 'NOR',
    'Norway': 'NOR',
    'Danemark': 'DNK',
    'Denmark': 'DNK',
    'Finlande': 'FIN',
    'Finland': 'FIN',
    'Portugal': 'PRT',
    'Pologne': 'POL',
    'Poland': 'POL',
    'Russie': 'RUS',
    'Russia': 'RUS',
    'Corée du Sud': 'KOR',
    'South Korea': 'KOR',
    'Singapour': 'SGP',
    'Singapore': 'SGP',
    'Nouvelle-Zélande': 'NZL',
    'New Zealand': 'NZL',
    'Argentine': 'ARG',
    'Afrique du Sud': 'ZAF',
    'South Africa': 'ZAF'
  }

  // Convert country names to ISO codes
  const getIsoCodes = (countries: string[]): string[] => {
    if (!countries || countries.length === 0) return []
    
    const isoCodes: string[] = []
    countries.forEach(country => {
      if (typeof country === 'string') {
        const trimmedCountry = country.trim()
        const isoCode = countryMapping[trimmedCountry]
        if (isoCode) {
          isoCodes.push(isoCode)
        }
      }
    })
    return isoCodes
  }

  const activeCountries = getIsoCodes(deploymentCountries)

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Pays concernés par vos cas d'usage IA</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#0080A3] rounded-full"></div>
              <span className="text-sm text-gray-600">Actif</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
              <span className="text-sm text-gray-600">Inactif</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {deploymentCountries && deploymentCountries.length > 0 ? (
          <>
            <div className="w-full h-[400px] bg-gray-50 rounded-lg overflow-hidden">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 130,
                  center: [10, 20]
                }}
              >
                <ZoomableGroup
                  zoom={1}
                  minZoom={0.75}
                  maxZoom={5}
                  center={[10, 20]}
                >
                  <Geographies geography="/world-110m.json">
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const isActive = activeCountries.includes(geo.properties.ISO_A3)
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={isActive ? "#0080A3" : "#E5E7EB"}
                            stroke="#FFFFFF"
                            strokeWidth={0.5}
                            style={{
                              default: {
                                fill: isActive ? "#0080A3" : "#E5E7EB",
                                outline: "none",
                              },
                              hover: {
                                fill: isActive ? "#006280" : "#D1D5DB",
                                outline: "none",
                                cursor: "pointer"
                              },
                              pressed: {
                                fill: isActive ? "#004A5C" : "#9CA3AF",
                                outline: "none",
                              },
                            }}
                          />
                        )
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{deploymentCountries.length}</span> pays concernés
                </p>
                <p className="text-sm text-gray-700">
                  {deploymentCountries.slice(0, 5).join(', ')}
                  {deploymentCountries.length > 5 && ` et ${deploymentCountries.length - 5} autres`}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">Aucun pays de déploiement</h3>
            <p className="text-sm text-gray-600">Les pays de déploiement apparaîtront ici une fois définis dans vos cas d'usage</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorldMap