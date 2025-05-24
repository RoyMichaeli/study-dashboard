import { useState, useEffect } from 'react'

interface FirebaseFirstNotificationProps {
  onConfirm: () => void
}

export const FirebaseFirstNotification: React.FC<FirebaseFirstNotificationProps> = ({ onConfirm }) => {
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // Show notification if this is the first time enabling Firebase-first mode
    const hasSeenNotification = localStorage.getItem('firebaseFirstNotificationSeen')
    if (!hasSeenNotification) {
      setShowNotification(true)
    }
  }, [])

  const handleConfirm = () => {
    localStorage.setItem('firebaseFirstNotificationSeen', 'true')
    setShowNotification(false)
    onConfirm()
  }

  if (!showNotification) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="text-3xl mr-3">🔥</div>
          <h2 className="text-xl font-bold text-gray-900">
            Firebase-First Mode
          </h2>
        </div>
        
        <div className="text-gray-700 mb-6 space-y-3">
          <p>
            <strong>המערכת עברה למצב Firebase-First!</strong>
          </p>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm">
              🚀 <strong>מה זה אומר:</strong>
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• Firebase הוא מקור האמת היחיד</li>
              <li>• הנתונים נשמרים ברשת בלבד</li>
              <li>• סנכרון מיידי בין מכשירים</li>
              <li>• אין עוד בעיות quota של localStorage</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm">
              ✅ <strong>יתרונות:</strong>
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• גישה לנתונים מכל מכשיר</li>
              <li>• גיבוי אוטומטי ברשת</li>
              <li>• ביצועים משופרים</li>
              <li>• אמינות גבוהה יותר</li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm">
              ⚠️ <strong>חשוב לדעת:</strong>
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• נדרשת התחברות לאינטרנט</li>
              <li>• הנתונים המקומיים יימחקו</li>
              <li>• הכל יישמר ב-Firebase</li>
            </ul>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            מבין ומסכים 🚀
          </button>
        </div>
      </div>
    </div>
  )
}