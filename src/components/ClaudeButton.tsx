import React, { useState } from 'react';
import { Brain, MessageSquare, HelpCircle, FileText } from 'lucide-react';

interface ClaudeButtonProps {
  courseName?: string;
  lessonName?: string;
  topicTitle?: string;
}

export const ClaudeButton: React.FC<ClaudeButtonProps> = ({ 
  courseName, 
  lessonName, 
  topicTitle 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const generatePrompt = (type: 'help' | 'review' | 'explain' | 'summary') => {
    const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
    
    switch (type) {
      case 'help':
        return `אני לומד ${courseName} - ${lessonName || topicTitle}.
        
תוכל לעזור לי להבין את הנושא בצורה פשוטה וברורה?
כלול דוגמאות ותרגילים.`;

      case 'review':
        const course = courses.find((c: any) => c.קורס === courseName);
        const lesson = course?.שיעורים.find((l: any) => l.שם === lessonName);
        
        return `צור לי 10 שאלות חזרה על ${courseName} - ${lessonName}.
        
הנושאים: ${lesson?.נושאים.map((t: any) => t.כותרת).join(', ')}
        
כלול שאלות בכל הרמות עם תשובות.`;

      case 'explain':
        return `הסבר לי בצורה מעמיקה את הנושא: ${topicTitle}
בקורס: ${courseName}
        
השתמש באנלוגיות ודוגמאות מהחיים.`;

      case 'summary':
        return `צור לי סיכום מקיף של ${lessonName || courseName}.
        
כלול:
- נקודות מפתח
- נוסחאות חשובות
- טיפים לזכירה
- דוגמאות`;
    }
  };

  const openClaude = (type: 'help' | 'review' | 'explain' | 'summary') => {
    const prompt = generatePrompt(type);
    const encodedPrompt = encodeURIComponent(prompt);
    window.open(`https://claude.ai/new?q=${encodedPrompt}`, '_blank');
    setShowMenu(false);
  };

  const copyToClipboard = (type: 'help' | 'review' | 'explain' | 'summary') => {
    const prompt = generatePrompt(type);
    navigator.clipboard.writeText(prompt).then(() => {
      alert('השאלה הועתקה! הדבק ב-Claude');
    });
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all transform hover:scale-105"
        title="קבל עזרה מ-Claude AI"
      >
        <Brain className="w-4 h-4" />
        <span className="text-sm font-medium">Claude AI</span>
      </button>

      {showMenu && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 min-w-[200px]">
          <div className="text-xs text-gray-500 px-3 py-1 font-medium">
            בחר פעולה:
          </div>
          
          <button
            onClick={() => openClaude('help')}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 rounded-md transition-colors text-right"
          >
            <HelpCircle className="w-4 h-4 text-purple-600" />
            <span className="text-sm">עזרה בנושא</span>
          </button>

          <button
            onClick={() => openClaude('review')}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 rounded-md transition-colors text-right"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-sm">שאלות חזרה</span>
          </button>

          <button
            onClick={() => openClaude('explain')}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 rounded-md transition-colors text-right"
          >
            <Brain className="w-4 h-4 text-green-600" />
            <span className="text-sm">הסבר מעמיק</span>
          </button>

          <button
            onClick={() => openClaude('summary')}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 rounded-md transition-colors text-right"
          >
            <FileText className="w-4 h-4 text-orange-600" />
            <span className="text-sm">סיכום חומר</span>
          </button>

          <div className="border-t border-gray-200 mt-2 pt-2">
            <div className="text-xs text-gray-500 px-3 py-1">
              או העתק ללוח:
            </div>
            
            <div className="flex gap-1 px-2">
              <button
                onClick={() => copyToClipboard('help')}
                className="flex-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                title="העתק בקשת עזרה"
              >
                עזרה
              </button>
              <button
                onClick={() => copyToClipboard('review')}
                className="flex-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                title="העתק בקשת שאלות"
              >
                שאלות
              </button>
              <button
                onClick={() => copyToClipboard('summary')}
                className="flex-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                title="העתק בקשת סיכום"
              >
                סיכום
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};