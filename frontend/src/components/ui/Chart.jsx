/**
 * Chart Component
 * 
 * A reusable chart component using Chart.js with customizable styling.
 * Supports various chart types and white-label theming.
 * 
 * Props:
 * - type: Chart type ('line', 'bar', 'doughnut', 'pie', 'radar', 'polarArea')
 * - data: Chart data object
 * - options: Chart options object
 * - title: Chart title (optional)
 * - subtitle: Chart subtitle (optional)
 * - className: Additional CSS classes
 * - loading: Show loading state (optional)
 * - error: Error message (optional)
 * 
 * API Endpoints:
 * - GET /api/analytics/{chartType} - Fetch chart data
 * - GET /api/analytics/attendance - Attendance trends
 * - GET /api/analytics/grades - Grade distribution
 * - GET /api/analytics/enrollment - Enrollment statistics
 * 
 * Expected Data Structure:
 * {
 *   "labels": ["Jan", "Feb", "Mar"],
 *   "datasets": [{
 *     "label": "Students",
 *     "data": [10, 20, 30],
 *     "backgroundColor": ["#3B82F6", "#10B981", "#F59E0B"]
 *   }]
 * }
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
} from 'chart.js';
import { useTranslation } from 'react-i18next';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const Chart = ({
  type = 'line',
  data,
  options = {},
  title,
  subtitle,
  className = '',
  loading = false,
  error = null,
  ...props
}) => {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);

  // Default theme colors
  const themeColors = {
    primary: 'var(--color-primary, #3B82F6)',
    secondary: 'var(--color-secondary, #10B981)',
    accent: 'var(--color-accent, #F59E0B)',
    success: 'var(--color-success, #10B981)',
    warning: 'var(--color-warning, #F59E0B)',
    error: 'var(--color-error, #EF4444)',
    info: 'var(--color-info, #3B82F6)',
    background: 'var(--color-background, #F9FAFB)',
    surface: 'var(--color-surface, #FFFFFF)',
    text: 'var(--color-text, #111827)',
    textSecondary: 'var(--color-textSecondary, #6B7280)'
  };

  // Default chart options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'var(--font-primary, Inter, sans-serif)',
            size: 12
          },
          color: themeColors.text
        }
      },
      tooltip: {
        backgroundColor: themeColors.surface,
        titleColor: themeColors.text,
        bodyColor: themeColors.textSecondary,
        borderColor: themeColors.primary,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          family: 'var(--font-primary, Inter, sans-serif)',
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          family: 'var(--font-primary, Inter, sans-serif)',
          size: 12
        }
      }
    },
    scales: type !== 'doughnut' && type !== 'pie' && type !== 'polarArea' ? {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: themeColors.textSecondary,
          font: {
            family: 'var(--font-primary, Inter, sans-serif)',
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: themeColors.textSecondary,
          font: {
            family: 'var(--font-primary, Inter, sans-serif)',
            size: 11
          }
        }
      }
    } : {}
  };

  // Sample data for demonstration
  const sampleData = {
    line: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: t('charts.attendance'),
        data: [85, 92, 78, 96, 88, 94],
        borderColor: themeColors.primary,
        backgroundColor: `${themeColors.primary}20`,
        tension: 0.4,
        fill: true
      }]
    },
    bar: {
      labels: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
      datasets: [{
        label: t('charts.enrollment'),
        data: [120, 135, 110, 125],
        backgroundColor: [
          themeColors.primary,
          themeColors.secondary,
          themeColors.accent,
          themeColors.success
        ]
      }]
    },
    doughnut: {
      labels: ['A', 'B', 'C', 'D', 'F'],
      datasets: [{
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          themeColors.success,
          themeColors.primary,
          themeColors.accent,
          themeColors.warning,
          themeColors.error
        ],
        borderWidth: 0
      }]
    },
    pie: {
      labels: ['Math', 'Science', 'English', 'History', 'Art'],
      datasets: [{
        data: [30, 25, 20, 15, 10],
        backgroundColor: [
          themeColors.primary,
          themeColors.secondary,
          themeColors.accent,
          themeColors.success,
          themeColors.warning
        ],
        borderWidth: 0
      }]
    }
  };

  useEffect(() => {
    if (chartRef.current && !loading && !error) {
      // Destroy existing chart
      if (chartInstance) {
        chartInstance.destroy();
      }

      // Create new chart
      const ctx = chartRef.current.getContext('2d');
      const chartData = data || sampleData[type] || sampleData.line;
      const chartOptions = { ...defaultOptions, ...options };

      const newChart = new ChartJS(ctx, {
        type,
        data: chartData,
        options: chartOptions
      });

      setChartInstance(newChart);
    }

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [type, data, options, loading, error]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`} {...props}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`} {...props}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-2">⚠️</div>
            <p className="text-gray-600" style={{ fontFamily: 'var(--font-primary)' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`} {...props}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--font-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="h-64">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default Chart;
