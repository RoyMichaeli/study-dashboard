import { useState } from 'react'
import { RefreshCw, Cloud, CloudOff, AlertCircle, Clock, X } from 'lucide-react'
import type { SyncState } from '../types'

interface SyncStatusProps {
  syncState: SyncState
  syncQueueStatus: { pending: number; items: any[] }
  onForceSync: () => Promise<void>
  userName?: string | null
}

export const SyncStatus = ({ syncState, syncQueueStatus, onForceSync, userName }: SyncStatusProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleForceSync = async () => {
    setIsSyncing(true)
    try {
      await onForceSync()
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusIcon = () => {
    if (syncState.isSyncing || isSyncing) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
    }
    if (syncState.error) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    }
    if (syncState.isOffline) {
      return <CloudOff className="w-4 h-4 text-gray-500" />
    }
    if (syncQueueStatus.pending > 0) {
      return <Clock className="w-4 h-4 text-yellow-500" />
    }
    return <Cloud className="w-4 h-4 text-green-500" />
  }

  const getStatusText = () => {
    if (syncState.isSyncing || isSyncing) return 'מסנכרן...'
    if (syncState.error) return 'שגיאת סנכרון'
    if (syncState.isOffline) return 'לא מחובר'
    if (syncQueueStatus.pending > 0) return `${syncQueueStatus.pending} פעולות ממתינות`
    if (syncState.lastSync) {
      const minutes = Math.floor((Date.now() - syncState.lastSync.getTime()) / 60000)
      if (minutes < 1) return 'סונכרן לפני רגע'
      if (minutes < 60) return `סונכרן לפני ${minutes} דקות`
      return `סונכרן לפני ${Math.floor(minutes / 60)} שעות`
    }
    return 'מסונכרן'
  }

  const getStatusColor = () => {
    if (syncState.error) return 'text-red-600 bg-red-50'
    if (syncState.isOffline) return 'text-gray-600 bg-gray-50'
    if (syncQueueStatus.pending > 0) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="relative">
      {/* Compact Status Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {syncQueueStatus.pending > 0 && (
          <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {syncQueueStatus.pending}
          </span>
        )}
      </button>

      {/* Expanded Status Panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">מצב סנכרון</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connection Status */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">חיבור:</span>
              <span className={syncState.isOffline ? 'text-red-600' : 'text-green-600'}>
                {syncState.isOffline ? 'לא מחובר לאינטרנט' : 'מחובר'}
              </span>
            </div>
            
            {userName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">משתמש:</span>
                <span className="text-gray-800">{userName}</span>
              </div>
            )}

            {syncState.lastSync && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">סנכרון אחרון:</span>
                <span className="text-gray-800">
                  {syncState.lastSync.toLocaleTimeString('he-IL')}
                </span>
              </div>
            )}
          </div>

          {/* Sync Queue */}
          {syncQueueStatus.pending > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                פעולות ממתינות לסנכרון ({syncQueueStatus.pending})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {syncQueueStatus.items.slice(0, 5).map((item) => (
                  <div key={item.id} className="text-xs text-gray-600 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{item.type === 'create' ? 'יצירת' : item.type === 'update' ? 'עדכון' : 'מחיקת'}</span>
                    <span>{item.collection === 'courses' ? 'קורס' : 'מפגש לימוד'}</span>
                  </div>
                ))}
                {syncQueueStatus.items.length > 5 && (
                  <div className="text-xs text-gray-500">
                    ועוד {syncQueueStatus.items.length - 5} פעולות...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {syncState.error && (
            <div className="mb-4 p-2 bg-red-50 rounded text-sm text-red-600">
              {syncState.error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleForceSync}
              disabled={syncState.isOffline || isSyncing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">סנכרן עכשיו</span>
            </button>
          </div>

          {/* Sync Tips */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {syncState.isOffline
                ? 'הנתונים נשמרים מקומית ויסונכרנו כשתחזור לאינטרנט'
                : syncQueueStatus.pending > 0
                ? 'הפעולות הממתינות יסונכרנו אוטומטית'
                : 'כל הנתונים מסונכרנים עם הענן'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}