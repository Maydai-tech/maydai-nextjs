'use client';

import { 
  Activity, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus, 
  Settings, 
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

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

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export default function ActivityTimeline({ activities, loading = false }: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'view':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'edit':
        return <Edit className="w-4 h-4 text-orange-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'invite':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'permission':
        return <Settings className="w-4 h-4 text-purple-500" />;
      case 'login':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'logout':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'create':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'update':
        return <Edit className="w-4 h-4 text-orange-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'view':
        return 'bg-blue-100 border-blue-200';
      case 'edit':
        return 'bg-orange-100 border-orange-200';
      case 'delete':
        return 'bg-red-100 border-red-200';
      case 'invite':
        return 'bg-green-100 border-green-200';
      case 'permission':
        return 'bg-purple-100 border-purple-200';
      case 'login':
        return 'bg-green-100 border-green-200';
      case 'logout':
        return 'bg-yellow-100 border-yellow-200';
      case 'create':
        return 'bg-blue-100 border-blue-200';
      case 'update':
        return 'bg-orange-100 border-orange-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité récente</h3>
        <p className="text-gray-500">
          Les activités des collaborateurs apparaîtront ici une fois qu'ils commenceront à utiliser l'application.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="relative">
          {/* Ligne de connexion */}
          {index < activities.length - 1 && (
            <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200"></div>
          )}
          
          <div className="flex space-x-4">
            {/* Icône de l'activité */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            
            {/* Contenu de l'activité */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action}
                  </p>
                  {activity.details && (
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.details}
                    </p>
                  )}
                  {activity.project_name && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#0080A3]/10 text-[#0080A3]">
                        {activity.project_name}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Timestamp */}
                <div className="flex-shrink-0 ml-4 text-right">
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              {/* Informations utilisateur */}
              <div className="mt-2 flex items-center space-x-2">
                <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {activity.user_name ? activity.user_name.charAt(0).toUpperCase() : activity.user_email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {activity.user_name || activity.user_email}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
