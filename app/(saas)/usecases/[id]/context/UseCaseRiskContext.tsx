'use client'

import React, { createContext, useContext } from 'react'
import type { UseRiskLevelReturn } from '../hooks/useRiskLevel'

const UseCaseRiskContext = createContext<UseRiskLevelReturn | null>(null)

export function UseCaseRiskProvider({
  value,
  children,
}: {
  value: UseRiskLevelReturn
  children: React.ReactNode
}) {
  return <UseCaseRiskContext.Provider value={value}>{children}</UseCaseRiskContext.Provider>
}

export function useUseCaseRisk(): UseRiskLevelReturn {
  const ctx = useContext(UseCaseRiskContext)
  if (!ctx) {
    throw new Error('useUseCaseRisk doit être utilisé sous UseCaseLayout (provider risque)')
  }
  return ctx
}
