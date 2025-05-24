import { Cloud, Loader } from 'lucide-react'

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
}

export const LoadingOverlay = ({ isLoading, message = 'טוען נתונים מהענן...' }: LoadingOverlayProps) => {
  if (!isLoading) return null
  
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Cloud className="w-16 h-16 text-blue-500" />
            <Loader className="w-8 h-8 text-blue-600 absolute bottom-0 right-0 animate-spin" />
          </div>
          
          <div className="text-center">
            <p className="text-lg font-medium text-gray-800">{message}</p>
            <p className="text-sm text-gray-600 mt-1">אנא המתן...</p>
          </div>
          
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}