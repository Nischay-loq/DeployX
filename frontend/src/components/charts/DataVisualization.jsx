import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Color palette - matching DeployX theme
const COLORS = ['#1890ff', '#13c2c2', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1', '#faad14', '#f97316'];

/**
 * Main data visualization component that detects chart type and renders appropriate chart
 */
const DataVisualization = ({ chartData }) => {
  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return null;
  }

  const { chart_type, title, data } = chartData;

  // Render based on chart type
  switch (chart_type) {
    case 'bar':
      return <BarChartComponent title={title} data={data} />;
    case 'line':
      return <LineChartComponent title={title} data={data} />;
    case 'pie':
      return <PieChartComponent title={title} data={data} />;
    case 'stat':
      return <StatCard title={title} data={data} />;
    default:
      return <BarChartComponent title={title} data={data} />;
  }
};

/**
 * Bar Chart Component
 */
const BarChartComponent = ({ title, data }) => {
  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Bar dataKey="value" fill="#1890ff" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Line Chart Component
 */
const LineChartComponent = ({ title, data }) => {
  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#1890ff" 
            strokeWidth={2}
            dot={{ fill: '#1890ff', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Pie Chart Component
 */
const PieChartComponent = ({ title, data }) => {
  return (
    <div className="my-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            wrapperStyle={{ fontSize: '14px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Stat Card Component for single metrics
 */
const StatCard = ({ title, data }) => {
  // Extract first data item or use data directly
  const stat = Array.isArray(data) ? data[0] : data;
  
  return (
    <div className="my-6 p-6 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-lg shadow-lg text-white">
      <h3 className="text-sm font-medium text-blue-100 mb-2">{title}</h3>
      <div className="flex items-baseline">
        <p className="text-4xl font-bold">{stat.value}</p>
        {stat.unit && <span className="ml-2 text-xl text-blue-100">{stat.unit}</span>}
      </div>
      {stat.name && (
        <p className="mt-2 text-sm text-blue-100">{stat.name}</p>
      )}
    </div>
  );
};

export default DataVisualization;
