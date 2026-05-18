import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import api from '../services/api';
import { DashboardStats } from '../types';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  Done: '#22c55e',
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  const statusChartData = stats
    ? Object.entries(stats.tasksByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const userChartData = stats?.tasksByUser.slice(0, 8) ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
          Good day, {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Here's what's happening across your projects.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total Tasks" value={stats?.totalTasks ?? 0} color="text-slate-800" />
        <StatCard label="Total Projects" value={stats?.totalProjects ?? 0} color="text-blue-600" />
        <StatCard label="In Progress" value={stats?.tasksByStatus['In Progress'] ?? 0} color="text-blue-600" />
        <StatCard label="Overdue" value={stats?.overdueTasks ?? 0} color="text-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-slate-700 mb-4">Tasks by Status</h2>
          {statusChartData.every((d) => d.value === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No tasks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-slate-700 mb-4">Tasks per Team Member</h2>
          {userChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No assigned tasks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userChartData} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-slate-700">Status Breakdown</h2>
          <Link to="/projects" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium">
            View projects →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {statusChartData.map((item) => (
            <div key={item.name} className="text-center p-3 sm:p-4 bg-slate-50 rounded-xl">
              <div className="text-xl sm:text-2xl font-bold" style={{ color: STATUS_COLORS[item.name] }}>
                {item.value}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-1 leading-tight">{item.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
