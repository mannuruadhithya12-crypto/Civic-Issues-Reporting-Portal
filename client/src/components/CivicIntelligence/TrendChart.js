import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../common/Card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function TrendChart({ data }) {
  if (!data || data.length === 0) return <Card className="p-6 text-center text-text-tertiary">No trend data available for this period.</Card>;

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Total Issues Reported',
        data: data.map(d => d.count),
        borderColor: '#0284c7', // primary-600
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        tension: 0.3
      },
      {
        label: 'Issues Resolved',
        data: data.map(d => d.resolved),
        borderColor: '#10b981', // success-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3
      }
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-xl font-bold text-text-primary mb-6">Issue Trends</h3>
      <div className="flex-1 w-full flex items-center justify-center relative min-h-[300px]">
        <div className="absolute inset-0">
          <Line options={{...options, maintainAspectRatio: false}} data={chartData} />
        </div>
      </div>
    </Card>
  );
}

export default TrendChart;
