import React from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signInAnonymously,
  signOut 
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { User, LogOut, Cloud, Wifi, WifiOff } from 'lucide-react';

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Anonymous login failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>שגיאה בטעינה: {error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <Cloud className="w-16 h-16 text-primary-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Study Dashboard</h1>
            <p className="text-gray-600">מערכת לימודים חכמה עם סנכרון ענן</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 
                       bg-white border border-gray-300 rounded-lg hover:bg-gray-50 
                       transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>התחבר עם Google</span>
            </button>
            
            <button
              onClick={signInAsGuest}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 
                       bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                       transition-colors"
            >
              <User className="w-5 h-5" />
              <span>המשך כאורח</span>
            </button>
          </div>
          
          <div className="mt-8 space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-green-500" />
              <span>סנכרון אוטומטי בין מכשירים</span>
            </div>
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-blue-500" />
              <span>עבודה במצב לא מקוון</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-purple-500" />
              <span>גיבוי אוטומטי לענן</span>
            </div>
          </div>
          
          <p className="mt-6 text-xs text-gray-500 text-center">
            הנתונים שלך מוגנים ומוצפנים. ניתן להשתמש במערכת גם ללא רישום.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* User info header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user.displayName || user.email || 'אורח'}
              </p>
              <p className="text-xs text-gray-500">
                {user.isAnonymous ? 'משתמש אורח' : 'מחובר לענן'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 
                     hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>יציאה</span>
          </button>
        </div>
      </div>
      
      {children}
    </div>
  );
};