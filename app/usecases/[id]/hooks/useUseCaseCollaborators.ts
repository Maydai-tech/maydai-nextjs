'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

interface Collaborator {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  role?: 'owner' | 'user';
  scope?: 'account' | 'registry' | 'usecase';
}

interface InviteCollaboratorData {
  email: string;
  firstName: string;
  lastName: string;
}

export function useUseCaseCollaborators(useCaseId: string) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  const fetchCollaborators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`/api/usecases/${useCaseId}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des collaborateurs');
      }

      const data = await response.json();
      setCollaborators(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [useCaseId, getAccessToken]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const inviteCollaborator = async (data: InviteCollaboratorData) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`/api/usecases/${useCaseId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'invitation');
      }

      await fetchCollaborators();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Une erreur est survenue'
      };
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `/api/usecases/${useCaseId}/collaborators/${collaboratorId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      await fetchCollaborators();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Une erreur est survenue'
      };
    }
  };

  return {
    collaborators,
    loading,
    error,
    inviteCollaborator,
    removeCollaborator,
    refetch: fetchCollaborators,
  };
}
