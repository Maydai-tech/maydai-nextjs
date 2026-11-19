'use client';

import { useState, useEffect } from 'react';
import { BetaRequest, supabase } from '@/lib/supabase';
import { FiMail, FiPhone, FiCalendar, FiUser, FiCheck, FiX, FiClock } from 'react-icons/fi';

export default function BetaRequestsPage() {
  const [requests, setRequests] = useState<BetaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBetaRequests();
  }, []);

  const fetchBetaRequests = async () => {
    try {
      // Obtenir le token de session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Erreur d\'authentification');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/beta-requests', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();

      if (response.ok) {
        setRequests(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement des demandes');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <FiCheck className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <FiX className="w-5 h-5 text-red-600" />;
      default:
        return <FiClock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvée';
      case 'rejected':
        return 'Rejetée';
      default:
        return 'En attente';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080a3]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demandes de Bêta Test</h1>
            <p className="text-gray-600 mt-2">
              Gérez les demandes d'accès à la version bêta de MaydAI
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#0080a3]">{requests.length}</div>
            <div className="text-sm text-gray-600">Total des demandes</div>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <FiClock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-yellow-800">
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-yellow-600">En attente</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <FiCheck className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-800">
                {requests.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-sm text-green-600">Approuvées</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <FiX className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-800">
                {requests.filter(r => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-red-600">Rejetées</div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Liste des demandes</h2>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <FiUser className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune demande de bêta test pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <FiUser className="w-5 h-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.full_name}
                      </h3>
                      <div className={`ml-3 px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(request.status)}`}>
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{getStatusText(request.status)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <FiMail className="w-4 h-4 mr-2" />
                        <a 
                          href={`mailto:${request.email}`}
                          className="hover:text-[#0080a3] transition-colors"
                        >
                          {request.email}
                        </a>
                      </div>
                      
                      {request.phone && (
                        <div className="flex items-center text-gray-600">
                          <FiPhone className="w-4 h-4 mr-2" />
                          <a 
                            href={`tel:${request.phone}`}
                            className="hover:text-[#0080a3] transition-colors"
                          >
                            {request.phone}
                          </a>
                        </div>
                      )}
                      
                      <div className="flex items-center text-gray-600 md:col-span-2">
                        <FiCalendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Motivations :</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {request.motivations}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 