#!/usr/bin/env node

/**
 * Script de validation des corrections de la carte mondiale
 * 
 * Ce script teste que :
 * 1. La Guyane est bien filtrée de la France
 * 2. Les USA sont toujours présents
 * 3. La France ne contient que 2 polygones (métropole + Corse)
 */

const fs = require('fs');
const topojson = require('topojson-client');

console.log('🔍 VALIDATION DES CORRECTIONS WORLDMAP\n');
console.log('='.repeat(60));

try {
  // Charger les données TopoJSON
  const data = JSON.parse(fs.readFileSync('public/world-110m.json', 'utf8'));
  const countries = topojson.feature(data, data.objects.countries);

  // Test 1 : Vérifier la France
  console.log('\n📍 TEST 1 : Structure de la France');
  console.log('-'.repeat(60));
  
  const france = countries.features.find(f => f.id === '250');
  if (!france) {
    console.error('❌ ERREUR : France non trouvée !');
    process.exit(1);
  }
  
  console.log(`Type de géométrie : ${france.geometry.type}`);
  console.log(`Nombre de polygones : ${france.geometry.coordinates.length}`);
  
  if (france.geometry.type !== 'MultiPolygon') {
    console.error('❌ ERREUR : La France devrait être un MultiPolygon');
    process.exit(1);
  }
  
  if (france.geometry.coordinates.length !== 3) {
    console.error(`❌ ERREUR : La France devrait avoir 3 polygones, trouvé ${france.geometry.coordinates.length}`);
    process.exit(1);
  }
  
  console.log('✅ Structure de la France correcte');

  // Test 2 : Analyser chaque polygone
  console.log('\n📍 TEST 2 : Analyse des polygones France');
  console.log('-'.repeat(60));
  
  let guyaneCounted = false;
  let metropoleCounted = false;
  let corseCounted = false;
  
  france.geometry.coordinates.forEach((polygon, idx) => {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    
    const processCoords = (coords) => {
      if (Array.isArray(coords)) {
        if (coords.length === 2 && typeof coords[0] === 'number') {
          minLon = Math.min(minLon, coords[0]);
          maxLon = Math.max(maxLon, coords[0]);
          minLat = Math.min(minLat, coords[1]);
          maxLat = Math.max(maxLat, coords[1]);
        } else {
          coords.forEach(processCoords);
        }
      }
    };
    
    polygon.forEach(processCoords);
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    // Identifier le territoire
    let territoire = 'Inconnu';
    if (centerLon < -50 && centerLat > 2 && centerLat < 6) {
      territoire = 'Guyane française';
      guyaneCounted = true;
    } else if (centerLon > 8 && centerLat > 41 && centerLat < 43) {
      territoire = 'Corse';
      corseCounted = true;
    } else if (centerLon > -5 && centerLon < 8 && centerLat > 42 && centerLat < 51) {
      territoire = 'France métropolitaine';
      metropoleCounted = true;
    }
    
    // Vérifier si sera filtré par la fonction processFranceGeometry
    const willBeKept = centerLon >= -10 && centerLon <= 15 && centerLat >= 40 && centerLat <= 55;
    const status = willBeKept ? '✅ GARDÉ' : '❌ FILTRÉ';
    
    console.log(`\nPolygone ${idx}: ${status}`);
    console.log(`  Territoire: ${territoire}`);
    console.log(`  Centre: lon=${centerLon.toFixed(2)}, lat=${centerLat.toFixed(2)}`);
  });
  
  if (!guyaneCounted) {
    console.error('\n❌ ERREUR : Guyane non détectée dans les polygones');
    process.exit(1);
  }
  
  if (!metropoleCounted) {
    console.error('\n❌ ERREUR : France métropolitaine non détectée');
    process.exit(1);
  }
  
  if (!corseCounted) {
    console.error('\n❌ ERREUR : Corse non détectée');
    process.exit(1);
  }
  
  console.log('\n✅ Tous les territoires français identifiés correctement');

  // Test 3 : Vérifier les USA
  console.log('\n📍 TEST 3 : Présence des États-Unis');
  console.log('-'.repeat(60));
  
  const usa = countries.features.find(f => f.id === '840');
  if (!usa) {
    console.error('❌ ERREUR : États-Unis non trouvés !');
    process.exit(1);
  }
  
  console.log(`ID: ${usa.id}`);
  console.log(`Nom: ${usa.properties.name}`);
  console.log(`Type: ${usa.geometry.type}`);
  console.log('✅ États-Unis présents et accessibles');

  // Test 4 : Simulation du filtrage
  console.log('\n📍 TEST 4 : Simulation du filtrage France');
  console.log('-'.repeat(60));
  
  const calculatePolygonCenter = (polygon) => {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;

    const processCoords = (coords) => {
      if (Array.isArray(coords)) {
        if (coords.length === 2 && typeof coords[0] === 'number') {
          minLon = Math.min(minLon, coords[0]);
          maxLon = Math.max(maxLon, coords[0]);
          minLat = Math.min(minLat, coords[1]);
          maxLat = Math.max(maxLat, coords[1]);
        } else {
          coords.forEach(processCoords);
        }
      }
    };

    polygon.forEach(processCoords);
    return {
      lon: (minLon + maxLon) / 2,
      lat: (minLat + maxLat) / 2
    };
  };

  const metropolitanPolygons = france.geometry.coordinates.filter((polygon) => {
    const center = calculatePolygonCenter(polygon);
    return center.lon >= -10 && center.lon <= 15 && center.lat >= 40 && center.lat <= 55;
  });

  console.log(`Polygones avant filtrage: ${france.geometry.coordinates.length}`);
  console.log(`Polygones après filtrage: ${metropolitanPolygons.length}`);
  console.log(`Polygones supprimés: ${france.geometry.coordinates.length - metropolitanPolygons.length}`);
  
  if (metropolitanPolygons.length !== 2) {
    console.error(`\n❌ ERREUR : Devrait rester 2 polygones (métropole + Corse), trouvé ${metropolitanPolygons.length}`);
    process.exit(1);
  }
  
  console.log('✅ Filtrage fonctionne correctement');

  // Résumé final
  console.log('\n' + '='.repeat(60));
  console.log('🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
  console.log('='.repeat(60));
  console.log('\n📋 Résumé :');
  console.log('  ✅ Structure France : 3 polygones (Guyane + Métropole + Corse)');
  console.log('  ✅ Filtrage : Guyane supprimée, 2 polygones restants');
  console.log('  ✅ USA : Toujours présent dans les données');
  console.log('\n🚀 Vous pouvez maintenant tester visuellement dans le navigateur');
  console.log('   → Ouvrez une page avec use case pour voir la carte');
  console.log('   → Vérifiez que la Guyane n\'apparaît pas');
  console.log('   → Vérifiez que les USA sont visibles\n');

} catch (error) {
  console.error('\n❌ ERREUR lors de l\'exécution du test :');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}

