'use client'

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { FeatureCollection } from 'geojson'

interface WorldMapProps {
  deploymentCountries: string[]
  countryUseCaseCount?: { [key: string]: number }
  className?: string
  showUseCaseCount?: boolean
}

// Types pour les zones géographiques
type GeographicZone = 'europe' | 'north-america' | 'south-america' | 'asia' | 'africa' | 'oceania' | 'world'

// Configuration des zones géographiques
interface ZoneConfig {
  center: [number, number]
  scale: number
  translate: [number, number]
  bounds?: [[number, number], [number, number]]
}

const ZONE_CONFIGS: Record<GeographicZone, ZoneConfig> = {
  'europe': {
    center: [12, 52],      // Centre pour voir du sud (Espagne) au nord (Scandinavie)
    scale: 400,            // Échelle très réduite pour vue panoramique complète de l'Europe
    translate: [450, 225],
    bounds: [[-10, 35], [40, 71]]  // Du Portugal à la Russie occidentale
  },
  'north-america': {
    center: [-100, 50],
    scale: 800,
    translate: [450, 225],
    bounds: [[-180, 15], [-50, 80]]
  },
  'south-america': {
    center: [-60, -15],
    scale: 1000,
    translate: [450, 225],
    bounds: [[-85, -60], [-30, 15]]
  },
  'asia': {
    center: [100, 30],
    scale: 800,
    translate: [450, 225],
    bounds: [[60, -10], [180, 60]]
  },
  'africa': {
    center: [20, 0],
    scale: 1000,
    translate: [450, 225],
    bounds: [[-20, -40], [55, 40]]
  },
  'oceania': {
    center: [150, -25],
    scale: 1200,
    translate: [450, 225],
    bounds: [[110, -50], [180, 0]]
  },
  'world': {
    center: [0, 0],
    scale: 175,
    translate: [450, 225]
  }
}

// Les DOM-TOM français font partie de la géométrie de la France (ID: 250)
// et seront filtrés en séparant les polygones métropole des polygones outre-mer

// Mapping des pays vers les continents
const COUNTRY_TO_CONTINENT: { [key: string]: GeographicZone } = {
  // Europe
  'France': 'europe',
  'FR': 'europe',
  'Allemagne': 'europe',
  'Germany': 'europe',
  'Royaume-Uni': 'europe',
  'United Kingdom': 'europe',
  'UK': 'europe',
  'Espagne': 'europe',
  'Spain': 'europe',
  'Italie': 'europe',
  'Italy': 'europe',
  'Belgique': 'europe',
  'Belgium': 'europe',
  'Pays-Bas': 'europe',
  'Netherlands': 'europe',
  'Suisse': 'europe',
  'Switzerland': 'europe',
  'Suède': 'europe',
  'Sweden': 'europe',
  'Norvège': 'europe',
  'Norway': 'europe',
  'Danemark': 'europe',
  'Denmark': 'europe',
  'Finlande': 'europe',
  'Finland': 'europe',
  'Portugal': 'europe',
  'Pologne': 'europe',
  'Poland': 'europe',
  'Russie': 'europe',
  'Russia': 'europe',
  'Slovénie': 'europe',
  'Slovenia': 'europe',
  'SI': 'europe',

  // Amérique du Nord
  'USA': 'north-america',
  'US': 'north-america',
  'United States': 'north-america',
  'États-Unis': 'north-america',
  'Etats-Unis': 'north-america',
  'Canada': 'north-america',
  'Mexique': 'north-america',
  'Mexico': 'north-america',

  // Amérique du Sud
  'Brésil': 'south-america',
  'Brazil': 'south-america',
  'Argentine': 'south-america',

  // Asie
  'Chine': 'asia',
  'China': 'asia',
  'Japon': 'asia',
  'Japan': 'asia',
  'Inde': 'asia',
  'India': 'asia',
  'Corée du Sud': 'asia',
  'South Korea': 'asia',
  'Singapour': 'asia',
  'Singapore': 'asia',

  // Afrique
  'Afrique du Sud': 'africa',
  'South Africa': 'africa',

  // Océanie
  'Australie': 'oceania',
  'Australia': 'oceania',
  'Nouvelle-Zélande': 'oceania',
  'New Zealand': 'oceania'
}

const WorldMap: React.FC<WorldMapProps> = ({ deploymentCountries, countryUseCaseCount = {}, className = "", showUseCaseCount = true }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const countryUseCaseCountRef = useRef(countryUseCaseCount)
  const currentZoneRef = useRef<GeographicZone>('world')

  // Fonction pour détecter la zone géographique basée sur les pays
  const detectGeographicZone = (countries: string[]): GeographicZone => {
    if (!countries || countries.length === 0) return 'world'
    
    const zones = new Set<GeographicZone>()
    
    countries.forEach(country => {
      const trimmedCountry = country.trim()
      const zone = COUNTRY_TO_CONTINENT[trimmedCountry]
      if (zone) {
        zones.add(zone)
      }
    })
    
    // Si tous les pays sont dans la même zone, utiliser cette zone
    if (zones.size === 1) {
      return Array.from(zones)[0]
    }
    
    // Sinon, utiliser la vue mondiale
    return 'world'
  }

  // Fonction pour séparer la France métropolitaine des DOM-TOM
  const processFranceGeometry = (feature: FeatureCollection['features'][0]): FeatureCollection['features'][0] => {
    if (feature.id !== '250' || feature.geometry.type !== 'MultiPolygon') {
      return feature
    }

    // Calculer le centre de chaque polygone pour identifier la métropole
    const calculatePolygonCenter = (polygon: number[][][]): { lon: number, lat: number } => {
      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity

      const processCoords = (coords: number[] | number[][] | number[][][]): void => {
        if (Array.isArray(coords)) {
          if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            minLon = Math.min(minLon, coords[0] as number)
            maxLon = Math.max(maxLon, coords[0] as number)
            minLat = Math.min(minLat, coords[1] as number)
            maxLat = Math.max(maxLat, coords[1] as number)
          } else {
            (coords as (number[] | number[][] | number[][][])[]).forEach(processCoords)
          }
        }
      }

      polygon.forEach(processCoords)
      return {
        lon: (minLon + maxLon) / 2,
        lat: (minLat + maxLat) / 2
      }
    }

    // Filtrer pour garder uniquement les polygones de France métropolitaine et Corse
    // France métropolitaine : longitude [-5, 10], latitude [41, 51]
    const metropolitanPolygons = (feature.geometry.coordinates as number[][][][]).filter((polygon: number[][][]) => {
      const center = calculatePolygonCenter(polygon)
      // Garder si le centre est en Europe (entre -10 et 15 de longitude, 40 et 55 de latitude)
      return center.lon >= -10 && center.lon <= 15 && center.lat >= 40 && center.lat <= 55
    })

    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: metropolitanPolygons
      }
    }
  }

  // Map country names to numeric IDs used in the TopoJSON file
  const countryNameToID: { [key: string]: string } = {
    'France': '250',
    'FR': '250',
    'USA': '840',
    'US': '840',
    'United States': '840',
    'États-Unis': '840',
    'Etats-Unis': '840',
    'Canada': '124',
    'Royaume-Uni': '826',
    'United Kingdom': '826',
    'UK': '826',
    'Allemagne': '276',
    'Germany': '276',
    'Espagne': '724',
    'Spain': '724',
    'Italie': '380',
    'Italy': '380',
    'Australie': '036',
    'Australia': '036',
    'Japon': '392',
    'Japan': '392',
    'Chine': '156',
    'China': '156',
    'Inde': '356',
    'India': '356',
    'Brésil': '076',
    'Brazil': '076',
    'Mexique': '484',
    'Mexico': '484',
    'Pays-Bas': '528',
    'Netherlands': '528',
    'Belgique': '056',
    'Belgium': '056',
    'Suisse': '756',
    'Switzerland': '756',
    'Suède': '752',
    'Sweden': '752',
    'Norvège': '578',
    'Norway': '578',
    'Danemark': '208',
    'Denmark': '208',
    'Finlande': '246',
    'Finland': '246',
    'Portugal': '620',
    'Pologne': '616',
    'Poland': '616',
    'Russie': '643',
    'Russia': '643',
    'Corée du Sud': '410',
    'South Korea': '410',
    'Singapour': '702',
    'Singapore': '702',
    'Nouvelle-Zélande': '554',
    'New Zealand': '554',
    'Argentine': '032',
    'Afrique du Sud': '710',
    'South Africa': '710',
    'Slovénie': '705',
    'Slovenia': '705',
    'SI': '705'
  }

  // Get numeric IDs for deployment countries
  const getActiveCountryIDs = (countries: string[]): Set<string> => {
    if (!countries || countries.length === 0) return new Set()
    
    const ids = new Set<string>()
    countries.forEach(country => {
      if (typeof country === 'string') {
        const trimmedCountry = country.trim()
        const id = countryNameToID[trimmedCountry]
        if (id) {
          ids.add(id)
        }
      }
    })
    return ids
  }

  const activeCountryIDs = getActiveCountryIDs(deploymentCountries)

  // Update the ref when countryUseCaseCount changes
  useEffect(() => {
    countryUseCaseCountRef.current = countryUseCaseCount
  }, [countryUseCaseCount])

  useEffect(() => {
    if (!svgRef.current) return

    const width = 900
    const height = 450

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const g = svg.append('g')

    // 1. Détecter la zone géographique
    const detectedZone = detectGeographicZone(deploymentCountries)
    const zoneConfig = ZONE_CONFIGS[detectedZone]
    
    // Mettre à jour la zone actuelle
    currentZoneRef.current = detectedZone

    // 2. Configurer la projection selon la zone détectée
    const projection = geoNaturalEarth1()
      .scale(zoneConfig.scale)
      .center(zoneConfig.center)
      .translate(zoneConfig.translate)

    const path = geoPath().projection(projection)

    // Load and render world map
    d3.json('/world-110m.json').then((world: any) => {
      const countries = feature(world, world.objects.countries) as unknown as FeatureCollection<any, any>
      
      // 3. Traiter la France pour séparer la métropole des DOM-TOM
      const processedCountries = countries.features.map(processFranceGeometry)

      // Draw countries
      g.selectAll('path')
        .data(processedCountries)
        .enter().append('path')
        .attr('d', path as any)
        .attr('fill', (d: any) => {
          const countryID = d.id
          return activeCountryIDs.has(countryID) ? '#0080A3' : '#E5E7EB'
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .style('cursor', (d: any) => {
          const countryID = d.id
          return activeCountryIDs.has(countryID) ? 'pointer' : 'default'
        })
        .on('mouseover', function(event: any, d: any) {
          const countryID = d.id
          const countryName = d.properties?.name || ''
          
          // Only show tooltip for countries with use cases
          if (activeCountryIDs.has(countryID)) {
            if (tooltipRef.current) {
              tooltipRef.current.style.display = 'block'
              tooltipRef.current.style.position = 'fixed'
              tooltipRef.current.style.left = `${event.clientX + 10}px`
              tooltipRef.current.style.top = `${event.clientY - 28}px`
              
              // Find all possible country keys that match this ID
              const possibleKeys = Object.entries(countryNameToID)
                .filter(([_, id]) => id === countryID)
                .map(([key, _]) => key)
              
              // Try to find the use case count using any of the possible keys
              let useCaseCount = 0
              for (const key of possibleKeys) {
                if (countryUseCaseCountRef.current[key]) {
                  useCaseCount = countryUseCaseCountRef.current[key]
                  break
                }
              }
              
              // Try to find a better display name (prefer short codes like FR, US, SI)
              const shortCode = possibleKeys.find(key => ['FR', 'US', 'SI'].includes(key))
              const displayName = shortCode || possibleKeys[0] || countryName
              
              if (showUseCaseCount) {
                tooltipRef.current.innerHTML = `
                  <div>
                    <div class="font-semibold">${displayName}</div>
                    <div class="text-xs">${useCaseCount} cas d'usage${useCaseCount > 1 ? 's' : ''}</div>
                  </div>
                `
              } else {
                tooltipRef.current.innerHTML = `
                  <div>
                    <div class="font-semibold">${displayName}</div>
                  </div>
                `
              }
            }
            
            // Change color on hover
            d3.select(this).attr('fill', '#006280')
          }
        })
        .on('mousemove', function(event: any, d: any) {
          // Update tooltip position on mouse move
          if (tooltipRef.current && tooltipRef.current.style.display === 'block') {
            tooltipRef.current.style.left = `${event.clientX + 10}px`
            tooltipRef.current.style.top = `${event.clientY - 28}px`
          }
        })
        .on('mouseout', function(event: any, d: any) {
          const countryID = d.id
          if (activeCountryIDs.has(countryID)) {
            d3.select(this).attr('fill', '#0080A3')
          }
          // Hide tooltip
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none'
          }
        })

      // Add zoom behavior with enhanced controls
      const zoom = d3.zoom()
        .scaleExtent([0.5, 8])
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        })

      svg.call(zoom as any)

      // 4. Animation de zoom vers les pays sélectionnés (si zone spécifique)
      if (detectedZone !== 'world') {
        const selectedFeatures = processedCountries.filter((d: any) => activeCountryIDs.has(d.id))
        
        if (selectedFeatures.length > 0) {
          // Créer une FeatureCollection pour obtenir les bornes globales
          const bounds = path.bounds({
            type: 'FeatureCollection',
            features: selectedFeatures
          })
          
          // Calculer le zoom optimal
          const [[x0, y0], [x1, y1]] = bounds
          const dx = x1 - x0
          const dy = y1 - y0
          const x = (x0 + x1) / 2
          const y = (y0 + y1) / 2
          
          // Facteur de zoom avec marge importante pour voir toute la région
          // Utilisation de 0.5 au lieu de 0.85 pour avoir plus d'espace autour
          const scale = Math.min(8, 0.5 / Math.max(dx / width, dy / height))
          const translate = [width / 2 - scale * x, height / 2 - scale * y]
          
          // Animation fluide (750ms pour plus de douceur)
          svg.transition()
            .duration(750)
            .call(
              zoom.transform as any,
              d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            )
        }
      }
    })
  }, [deploymentCountries, activeCountryIDs])

  // Fonction pour obtenir le nom de la zone en français
  const getZoneDisplayName = (zone: GeographicZone): string => {
    const zoneNames: Record<GeographicZone, string> = {
      'europe': 'Europe',
      'north-america': 'Amérique du Nord',
      'south-america': 'Amérique du Sud',
      'asia': 'Asie',
      'africa': 'Afrique',
      'oceania': 'Océanie',
      'world': 'Monde'
    }
    return zoneNames[zone]
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">Répartition géographique</h3>
            {currentZoneRef.current !== 'world' && (
              <span className="px-2 py-1 bg-[#0080A3] text-white text-xs font-medium rounded-full">
                {getZoneDisplayName(currentZoneRef.current)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
              <span className="text-sm text-gray-600">Sans cas d'usage</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-[#0080A3] rounded-sm"></div>
              <span className="text-sm text-gray-600">Avec cas d'usage</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="relative">
          <svg ref={svgRef} className="w-full h-auto" />
          <div 
            ref={tooltipRef}
            className="fixed pointer-events-none bg-gray-900 text-white px-3 py-2 rounded text-sm shadow-lg z-50"
            style={{ display: 'none' }}
          />
        </div>
        
        
      </div>
    </div>
  )
}

export default WorldMap