import { useState, useEffect } from 'react'
import { RefreshCw, Cloud, CloudOff, AlertCircle, Clock, X, CheckCircle, Smartphone, Monitor } from 'lucide-react'
import type { SyncState } from '../types'
import { enhancedFirebaseService } from '../services/EnhancedFirebaseService'

interface EnhancedSyncStatusProps {
  syncState: SyncState
  syncQueueStatus: { pending: number; items: any[] }
  onForceSync: () => Promise<void>
  userName?: string | null
  getSyncMetadata?: () => any
}

export const EnhancedSyncStatus = ({ 
  syncState, 
  syncQueueStatus, 
  onForceSync, 
  userName,
  getSyncMetadata 
}: EnhancedSyncStatusProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [devices, setDevices] = useState<any[]>([])
  const [syncMetadata, setSyncMetadata] = useState<any>(null)

  // Update sync metadata periodically
  useEffect(() => {
    if (!getSyncMetadata) return;
    
    const updateMetadata = () => {
      setSyncMetadata(getSyncMetadata());
    };
    
    updateMetadata();
    const interval = setInterval(updateMetadata, 5000);
    
    return () => clearInterval(interval);
  }, [getSyncMetadata]);

  // Load device activity when expanded
  useEffect(() => {
    if (isExpanded) {
      enhancedFirebaseService.getDeviceActivity().then(({ devices }) => {
        setDevices(devices);
      });
    }
  }, [isExpanded]);

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
    if (syncMetadata?.hasLocalChanges) {
      return <Clock className="w-4 h-4 text-orange-500" />
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  const getStatusText = () => {
    if (syncState.isSyncing || isSyncing) return 'מסנכרן...'
    if (syncState.error) return 'שגיאת סנכרון'
    if (syncState.isOffline) return 'לא מחובר'
    if (syncQueueStatus.pending > 0) return `${syncQueueStatus.pending} פעולות ממתינות`
    if (syncMetadata?.hasLocalChanges) return 'יש שינויים מקומיים'
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
    if (syncMetadata?.hasLocalChanges) return 'text-orange-600 bg-orange-50'
    return 'text-green-600 bg-green-50'
  }

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="w-3 h-3" />
    }
    return <Monitor className="w-3 h-3" />
  }

  return (
    <div className="relative">
      {/* Compact Status Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:shadow-md ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {syncQueueStatus.pending > 0 && (
          <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
            {syncQueueStatus.pending}
          </span>
        )}
        {syncMetadata?.hasLocalChanges && (
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Expanded Status Panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                מצב סנכרון מתקדם
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* User & Connection Info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">משתמש:</span>
                <span className="text-gray-800 font-medium">
                  {userName || 'אורח'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">חיבור:</span>
                <span className={syncState.isOffline ? 'text-red-600' : 'text-green-600'}>
                  {syncState.isOffline ? 'לא מחובר לאינטרנט' : 'מחובר'}
                </span>
              </div>

              {syncState.lastSync && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">סנכרון אחרון:</span>
                  <span className="text-gray-800">
                    {syncState.lastSync.toLocaleTimeString('he-IL')}
                  </span>
                </div>
              )}
              
              {syncMetadata && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">שינויים מקומיים:</span>
                  <span className={syncMetadata.hasLocalChanges ? 'text-orange-600' : 'text-green-600'}>
                    {syncMetadata.hasLocalChanges ? 'כן' : 'לא'}
                  </span>
                </div>
              )}
            </div>

            {/* Active Devices */}
            {devices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">מכשירים פעילים</h4>
                <div className="space-y-1">
                  {devices.map((device) => (
                    <div key={device.deviceId} className="flex items-center gap-2 text-xs text-gray-600">
                      {getDeviceIcon(device.browser)}
                      <span className="flex-1 truncate">{device.browser.split(' ')[0]}</span>
                      <span className="text-gray-400">
                        {new Date(device.lastActive).toLocaleTimeString('he-IL')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Queue */}
            {syncQueueStatus.pending > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  פעולות ממתינות לסנכרון ({syncQueueStatus.pending})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-yellow-50 rounded p-2">
                  {syncQueueStatus.items.slice(0, 5).map((item) => (
                    <div key={item.id} className="text-xs text-gray-600 flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      <span>{item.type === 'create' ? 'יצירת' : item.type === 'update' ? 'עדכון' : 'מחיקת'}</span>
                      <span>{item.collection === 'courses' ? 'קורס' : 'מפגש לימוד'}</span>
                    </div>
                  ))}
                  {syncQueueStatus.items.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      ועוד {syncQueueStatus.items.length - 5} פעולות...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {syncState.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700 flex-1">{syncState.error}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleForceSync}
                disabled={syncState.isOffline || isSyncing}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">סנכרן עכשיו</span>
              </button>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                💡 טיפ: הנתונים שלך מסונכרנים אוטומטית עם הענן. 
                {syncState.isOffline
                  ? ' כרגע אתה במצב לא מקוון - השינויים יסונכרנו כשתחזור לאינטרנט.'
                  : syncQueueStatus.pending > 0
                  ? ' יש פעולות שממתינות לסנכרון ויטופלו אוטומטית.'
                  : ' כל השינויים שלך נשמרים באופן מיידי.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}