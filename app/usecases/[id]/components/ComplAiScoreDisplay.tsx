import React from 'react'
import { Shield, Bot, TrendingUp } from 'lucide-react'

interface ComplAiScoreDisplayProps {
  score: number | null
  bonus: number
  modelInfo: {
    id: string
    name: string
    provider: string
  } | null
  className?: string
}

export const ComplAiScoreDisplay: React.FC<ComplAiScoreDisplayProps> = ({
  score,
  bonus,
  modelInfo,
  className = ''
}) => {
  if (!modelInfo || !score || bonus <= 0) {
    return null
  }

  const scorePercentage = Math.round(score * 100)

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Bonus COMPL-AI
            </h3>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              +{bonus.toFixed(1)} pts
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bot className="w-4 h-4" />
              <span className="font-medium">{modelInfo.name}</span>
              <span className="text-gray-400">•</span>
              <span>{modelInfo.provider}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                Score COMPL-AI:
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scorePercentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {scorePercentage}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            Le bonus est calculé selon la formule : Score final = (Score de base + Bonus) / Score maximum possible
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplAiScoreDisplay