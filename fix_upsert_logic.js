const fs = require('fs')

// Lire le fichier
const filePath = '/Users/thomaschippeaux/Desktop/workspacemaydai/maydai-nextjs/app/api/generate-report/route.ts'
let content = fs.readFileSync(filePath, 'utf8')

// Remplacer la logique DELETE + INSERT par UPSERT
const oldLogic = `        // Supprimer l'ancien enregistrement s'il existe (contrainte d'unicité)
        await supabase
          .from('usecase_nextsteps')
          .delete()
          .eq('usecase_id', usecase_id)

        // Insérer les nouvelles données structurées
        const { error: nextStepsSaveError } = await supabase
          .from('usecase_nextsteps')
          .insert(nextStepsData)`

const newLogic = `        // Utiliser UPSERT pour mettre à jour ou insérer les données
        const { error: nextStepsSaveError } = await supabase
          .from('usecase_nextsteps')
          .upsert(nextStepsData, { 
            onConflict: 'usecase_id',
            ignoreDuplicates: false 
          })`

// Appliquer la correction
content = content.replace(oldLogic, newLogic)

// Sauvegarder le fichier
fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Correction UPSERT appliquée avec succès')
