import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { StudyCourse } from '../store/useStore'

interface ProgressChartProps {
  courses: StudyCourse[]
}

export const ProgressChart = ({ courses }: ProgressChartProps) => {
  const barData = courses.map(course => ({
    name: course.מצגת.slice(0, 20) + (course.מצגת.length > 20 ? '...' : ''),
    progress: course.progress,
    completed: course.נושאים.reduce((sum, topic) => sum + (topic.completedGoals?.length || 0), 0),
    total: course.נושאים.reduce((sum, topic) => sum + topic.מטרות.length, 0)
  }))
  
  const totalGoals = courses.reduce((sum, course) => 
    sum + course.נושאים.reduce((topicSum, topic) => topicSum + topic.מטרות.length, 0), 0
  )
  const completedGoals = courses.reduce((sum, course) => 
    sum + course.נושאים.reduce((topicSum, topic) => topicSum + (topic.completedGoals?.length || 0), 0), 0
  )
  const pendingGoals = totalGoals - completedGoals
  
  const pieData = [
    { name: 'הושלם', value: completedGoals, color: '#10b981' },
    { name: 'ממתין', value: pendingGoals, color: '#f59e0b' }
  ]
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Bar Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">התקדמות לפי קורס</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis domain={[0, 100]} />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'התקדמות']}
              labelFormatter={(label) => `קורס: ${label}`}
            />
            <Bar dataKey="progress" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Pie Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">סטטוס כללי</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [`${value} מטרות`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-4">
          {pieData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}