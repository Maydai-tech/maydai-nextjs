'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useApiCall } from '@/lib/api-auth';
import { 
  Activity, 
  Calendar, 
  Filter, 
  Download,
  Search,
  Users,
  Clock,
  TrendingUp
} from 'lucide-react';
import ActivityTimeline from '@/components/ActivityTimeline';

interface ActivityItem {
  id: string;
  type: 'view' | 'edit' | 'delete' | 'invite' | 'permission' | 'login' | 'logout' | 'create' | 'update';
  action: string;
  details?: string;
  project_name?: string;
  timestamp: string;
  user_email: string;
  user_name?: string;
}

export default function CollaborationActivitiesPage() {
  const { user } = useAuth();
  const api = useApiCall();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    dateRange: '7days',
    user: 'all',
    project: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les activités au montage du composant
  useEffect(() => {
    loadActivities();
  }, [filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Pour l'instant, utiliser des données mockées
      // TODO: Implémenter l'API réelle
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'view',
          action: 'Consultation du rapport d\'audit RGPD',
          details: 'Consultation du rapport final pour le trimestre Q1 2024',
          project_name: 'Audit RGPD - Q1 2024',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user_email: 'collaborateur1@example.com',
          user_name: 'Jean Dupont'
        },
        {
          id: '2',
          type: 'edit',
          action: 'Modification du questionnaire de conformité',
          details: 'Ajout de 3 nouvelles questions sur la protection des données personnelles',
          project_name: 'Conformité ISO 27001',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          user_email: 'collaborateur2@example.com',
          user_name: 'Marie Martin'
        },
        {
          id: '3',
          type: 'create',
          action: 'Création d\'un nouveau projet d\'audit',
          details: 'Nouveau projet d\'audit de sécurité informatique',
          project_name: 'Audit Sécurité IT 2024',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          user_email: 'admin@example.com',
          user_name: 'Pierre Admin'
        },
        {
          id: '4',
          type: 'invite',
          action: 'Invitation d\'un nouveau collaborateur',
          details: 'Invitation de Sarah Johnson avec les droits d\'éditeur',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user_email: 'admin@example.com',
          user_name: 'Pierre Admin'
        },
        {
          id: '5',
          type: 'permission',
          action: 'Modification des permissions',
          details: 'Élévation des droits de Marie Martin de "Lecture seule" à "Éditeur"',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          user_email: 'admin@example.com',
          user_name: 'Pierre Admin'
        },
        {
          id: '6',
          type: 'login',
          action: 'Connexion à l\'application',
          details: 'Première connexion depuis un nouvel appareil',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          user_email: 'collaborateur1@example.com',
          user_name: 'Jean Dupont'
        },
        {
          id: '7',
          type: 'update',
          action: 'Mise à jour des scores de conformité',
          details: 'Recalcul automatique des scores après modification des réponses',
          project_name: 'Audit RGPD - Q1 2024',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          user_email: 'system@maydai.com',
          user_name: 'Système'
        },
        {
          id: '8',
          type: 'delete',
          action: 'Suppression d\'un élément de projet',
          details: 'Suppression d\'une question obsolète du questionnaire',
          project_name: 'Conformité ISO 27001',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          user_email: 'collaborateur2@example.com',
          user_name: 'Marie Martin'
        }
      ];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    // Filtre par type
    if (filters.type !== 'all' && activity.type !== filters.type) {
      return false;
    }

    // Filtre par utilisateur
    if (filters.user !== 'all' && activity.user_email !== filters.user) {
      return false;
    }

    // Filtre par projet
    if (filters.project !== 'all' && activity.project_name !== filters.project) {
      return false;
    }

    // Filtre par recherche
    if (searchTerm && !activity.action.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !activity.details?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !activity.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !activity.user_email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  });

  const getUniqueUsers = () => {
    const users = [...new Set(activities.map(a => a.user_email))];
    return users.map(email => {
      const activity = activities.find(a => a.user_email === email);
      return {
        email,
        name: activity?.user_name
      };
    });
  };

  const getUniqueProjects = () => {
    return [...new Set(activities.map(a => a.project_name).filter(Boolean))];
  };

  const getActivityStats = () => {
    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      today: activities.filter(a => new Date(a.timestamp) >= new Date(today.toDateString())).length,
      last7Days: activities.filter(a => new Date(a.timestamp) >= last7Days).length,
      last30Days: activities.filter(a => new Date(a.timestamp) >= last30Days).length,
      total: activities.length
    };
  };

  const stats = getActivityStats();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Activity className="w-8 h-8 mr-3 text-[#0080A3]" />
          Activités des collaborateurs
        </h1>
        <p className="text-gray-600">
          Suivez toutes les actions et interactions des membres de votre équipe
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">7 derniers jours</p>
              <p className="text-2xl font-bold text-gray-900">{stats.last7Days}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">30 derniers jours</p>
              <p className="text-2xl font-bold text-gray-900">{stats.last30Days}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher dans les activités..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
            />
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="view">Consultations</option>
              <option value="edit">Modifications</option>
              <option value="create">Créations</option>
              <option value="delete">Suppressions</option>
              <option value="invite">Invitations</option>
              <option value="permission">Permissions</option>
              <option value="login">Connexions</option>
            </select>

            <select
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
            >
              <option value="all">Tous les utilisateurs</option>
              {getUniqueUsers().map(user => (
                <option key={user.email} value={user.email}>
                  {user.name || user.email}
                </option>
              ))}
            </select>

            <select
              value={filters.project}
              onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
            >
              <option value="all">Tous les projets</option>
              {getUniqueProjects().map(project => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>

            <button className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Timeline des activités */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Activités récentes
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredActivities.length} activité{filteredActivities.length > 1 ? 's' : ''} trouvée{filteredActivities.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="p-6">
          <ActivityTimeline activities={filteredActivities} loading={loading} />
        </div>
      </div>
    </div>
  );
}
