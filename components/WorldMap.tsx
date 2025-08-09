'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default icons in webpack environments
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface WorldMapProps {
  deploymentCountries: string[]
  className?: string
}

const WorldMap: React.FC<WorldMapProps> = ({ deploymentCountries, className = "" }) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<L.Map | null>(null)

  // Map country names to coordinates for markers
  const countryCoordinates: { [key: string]: [number, number] } = {
    'France': [46.2276, 2.2137],
    'USA': [39.8283, -98.5795],
    'United States': [39.8283, -98.5795],
    'États-Unis': [39.8283, -98.5795],
    'Etats-Unis': [39.8283, -98.5795],
    'Canada': [56.1304, -106.3468],
    'Royaume-Uni': [55.3781, -3.4360],
    'United Kingdom': [55.3781, -3.4360],
    'UK': [55.3781, -3.4360],
    'Allemagne': [51.1657, 10.4515],
    'Germany': [51.1657, 10.4515],
    'Espagne': [40.4637, -3.7492],
    'Spain': [40.4637, -3.7492],
    'Italie': [41.8719, 12.5674],
    'Italy': [41.8719, 12.5674],
    'Australie': [-25.2744, 133.7751],
    'Australia': [-25.2744, 133.7751],
    'Japon': [36.2048, 138.2529],
    'Japan': [36.2048, 138.2529],
    'Chine': [35.8617, 104.1954],
    'China': [35.8617, 104.1954],
    'Inde': [20.5937, 78.9629],
    'India': [20.5937, 78.9629],
    'Brésil': [-14.2350, -51.9253],
    'Brazil': [-14.2350, -51.9253],
    'Mexique': [23.6345, -102.5528],
    'Mexico': [23.6345, -102.5528],
    'Pays-Bas': [52.1326, 5.2913],
    'Netherlands': [52.1326, 5.2913],
    'Belgique': [50.5039, 4.4699],
    'Belgium': [50.5039, 4.4699],
    'Suisse': [46.8182, 8.2275],
    'Switzerland': [46.8182, 8.2275],
    'Suède': [60.1282, 18.6435],
    'Sweden': [60.1282, 18.6435],
    'Norvège': [60.4720, 8.4689],
    'Norway': [60.4720, 8.4689],
    'Danemark': [56.2639, 9.5018],
    'Denmark': [56.2639, 9.5018],
    'Finlande': [61.9241, 25.7482],
    'Finland': [61.9241, 25.7482],
    'Portugal': [39.3999, -8.2245],
    'Pologne': [51.9194, 19.1451],
    'Poland': [51.9194, 19.1451],
    'Russie': [61.5240, 105.3188],
    'Russia': [61.5240, 105.3188],
    'Corée du Sud': [35.9078, 127.7669],
    'South Korea': [35.9078, 127.7669],
    'Singapour': [1.3521, 103.8198],
    'Singapore': [1.3521, 103.8198],
    'Nouvelle-Zélande': [-40.9006, 174.8860],
    'New Zealand': [-40.9006, 174.8860],
    'Argentine': [-38.4161, -63.6167],
    'Afrique du Sud': [-30.5595, 22.9375],
    'South Africa': [-30.5595, 22.9375]
  }

  // Get coordinates for deployment countries
  const getCountryCoordinates = (countries: string[]): Array<{ name: string; coords: [number, number] }> => {
    if (!countries || countries.length === 0) return []
    
    const coordinates: Array<{ name: string; coords: [number, number] }> = []
    countries.forEach(country => {
      if (typeof country === 'string') {
        const trimmedCountry = country.trim()
        const coords = countryCoordinates[trimmedCountry]
        if (coords) {
          coordinates.push({ name: trimmedCountry, coords })
        }
      }
    })
    return coordinates
  }

  const activeCountryCoords = getCountryCoordinates(deploymentCountries)

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return

    // Initialize the map
    const map = L.map(mapRef.current).setView([20, 0], 2)
    leafletMapRef.current = map

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Add markers for deployment countries
    activeCountryCoords.forEach(({ name, coords }) => {
      const marker = L.marker(coords).addTo(map)
      marker.bindPopup(`<b>${name}</b><br/>Pays de déploiement IA`)
      
      // Custom marker style
      const customIcon = L.divIcon({
        html: '<div style="background-color: #0080A3; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        className: 'custom-marker'
      })
      marker.setIcon(customIcon)
    })

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [deploymentCountries])

  // Update markers when deployment countries change
  useEffect(() => {
    if (!leafletMapRef.current) return

    // Clear existing markers
    leafletMapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        leafletMapRef.current?.removeLayer(layer)
      }
    })

    // Add new markers
    activeCountryCoords.forEach(({ name, coords }) => {
      const marker = L.marker(coords).addTo(leafletMapRef.current!)
      marker.bindPopup(`<b>${name}</b><br/>Pays de déploiement IA`)
      
      const customIcon = L.divIcon({
        html: '<div style="background-color: #0080A3; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        className: 'custom-marker'
      })
      marker.setIcon(customIcon)
    })
  }, [deploymentCountries, activeCountryCoords])

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Pays concernés par vos cas d'usage IA</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#0080A3] rounded-full"></div>
              <span className="text-sm text-gray-600">Déploiement actif</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {deploymentCountries && deploymentCountries.length > 0 ? (
          <>
            <div className="w-full h-[400px] bg-gray-50 rounded-lg overflow-hidden border">
              <div ref={mapRef} className="w-full h-full" />
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