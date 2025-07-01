#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fonction pour échapper les caractères dans un fichier
function escapeEntities(content) {
  // Échapper les apostrophes dans le contenu JSX
  content = content.replace(/(\>[^<]*)'([^<]*\<)/g, '$1&apos;$2');
  
  // Échapper les guillemets dans le contenu JSX
  content = content.replace(/(\>[^<]*)"([^<]*\<)/g, '$1&quot;$2');
  
  return content;
}

// Fonction pour parcourir récursivement les fichiers
function processFiles(dir, extensions = ['.tsx', '.jsx']) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && !['node_modules', '.next'].includes(file)) {
      processFiles(filePath, extensions);
    } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = escapeEntities(content);
        
        if (content !== newContent) {
          fs.writeFileSync(filePath, newContent);
          console.log(`✅ Fixed: ${filePath}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    }
  }
}

// Démarrer le traitement
console.log('🔧 Starting ESLint entity fixes...');
processFiles(__dirname + '/..');
console.log('✅ All files processed!');