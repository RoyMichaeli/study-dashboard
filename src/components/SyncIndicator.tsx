import React from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertTriangle, WifiOff, HardDrive } from 'lucide-react';
import type { SyncState } from '../types';
import { isFirebaseConfigured } from '../config/firebase';

interface SyncIndicatorProps {
  syncState: SyncState;
  user: any;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ syncState, user }) => {
  const { isSyncing, lastSync, error, isOffline } = syncState;

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
      {/* Local Mode Indicator */}
      {!isFirebaseConfigured && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 border border-blue-200 
                      text-blue-800 rounded-lg shadow-sm text-sm">
          <HardDrive className="w-4 h-4" />
          <span>מצב מקומי - הכל נשמר במכשיר</span>
        </div>
      )}
      {/* Offline Status */}
      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 border border-yellow-200 
                      text-yellow-800 rounded-lg shadow-sm text-sm">
          <WifiOff className="w-4 h-4" />
          <span>לא מחובר - עובד במצב מקומי</span>
        </div>
      )}

      {/* User Status */}
      {!user && !isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 border border-blue-200 
                      text-blue-800 rounded-lg shadow-sm text-sm">
          <CloudOff className="w-4 h-4" />
          <span>עובד במצב מקומי - התחבר לסנכרון</span>
        </div>
      )}

      {/* Syncing Status */}
      {isSyncing && user && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 border border-blue-200 
                      text-blue-800 rounded-lg shadow-sm text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>מסנכרן...</span>
        </div>
      )}

      {/* Error Status */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-200 
                      text-red-800 rounded-lg shadow-sm text-sm max-w-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Success Status */}
      {lastSync && !isSyncing && !error && user && !isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-200 
                      text-green-800 rounded-lg shadow-sm text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>
            סונכרן {new Date(lastSync).toLocaleTimeString('he-IL', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      )}

      {/* Online and Connected Status */}
      {user && !isOffline && !isSyncing && !error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 
                      text-green-700 rounded-lg shadow-sm text-sm">
          <Cloud className="w-4 h-4" />
          <span>מחובר לענן</span>
        </div>
      )}
    </div>
  );
};