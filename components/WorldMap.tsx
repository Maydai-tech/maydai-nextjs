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

const WorldMap: React.FC<WorldMapProps> = ({ deploymentCountries, countryUseCaseCount = {}, className = "", showUseCaseCount = true }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const countryUseCaseCountRef = useRef(countryUseCaseCount)

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

    // Set up projection
    const projection = geoNaturalEarth1()
      .scale(175)
      .translate([width / 2, height / 2])

    const path = geoPath().projection(projection)

    // Load and render world map
    d3.json('/world-110m.json').then((world: any) => {
      const countries = feature(world, world.objects.countries) as unknown as FeatureCollection<any, any>

      // Draw countries
      g.selectAll('path')
        .data(countries.features)
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

      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        })

      svg.call(zoom as any)
    })
  }, [deploymentCountries, activeCountryIDs])

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Répartition géographique</h3>
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