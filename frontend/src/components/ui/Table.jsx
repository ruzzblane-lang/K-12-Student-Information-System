/**
 * Table Component
 * 
 * A reusable table component with sorting, filtering, and pagination.
 * Supports white-label theming and responsive design.
 * 
 * Props:
 * - data: Array of data objects
 * - columns: Array of column definitions
 * - loading: Show loading state (optional)
 * - error: Error message (optional)
 * - sortable: Enable sorting (default: true)
 * - filterable: Enable filtering (default: true)
 * - pagination: Enable pagination (default: true)
 * - pageSize: Items per page (default: 10)
 * - className: Additional CSS classes
 * - onRowClick: Row click handler (optional)
 * - onSort: Sort change handler (optional)
 * - onFilter: Filter change handler (optional)
 * 
 * Column Definition:
 * {
 *   key: 'fieldName',
 *   label: 'Display Label',
 *   sortable: true,
 *   filterable: true,
 *   render: (value, row) => JSX.Element, // Custom render function
 *   width: '200px', // Column width
 *   align: 'left' | 'center' | 'right'
 * }
 * 
 * API Endpoints:
 * - GET /api/students - Fetch students data
 * - GET /api/teachers - Fetch teachers data
 * - GET /api/courses - Fetch courses data
 * - GET /api/grades - Fetch grades data
 * - GET /api/attendance - Fetch attendance data
 * 
 * Expected Data Structure:
 * [
 *   {
 *     "id": 1,
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "grade": "10",
 *     "status": "active"
 *   }
 * ]
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const Table = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  sortable = true,
  filterable = true,
  pagination = true,
  pageSize = 10,
  className = '',
  onRowClick,
  onSort,
  onFilter,
  ...props
}) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});

  // Sample data for demonstration
  const sampleData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', grade: '10', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', grade: '11', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', grade: '9', status: 'inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', grade: '12', status: 'active' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', grade: '10', status: 'pending' }
  ];

  const sampleColumns = [
    { key: 'id', label: t('tables.id'), sortable: true, width: '80px' },
    { key: 'name', label: t('tables.name'), sortable: true, filterable: true },
    { key: 'email', label: t('tables.email'), sortable: true, filterable: true },
    { key: 'grade', label: t('tables.grade'), sortable: true, filterable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true, 
      filterable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' :
          value === 'inactive' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {t(`common.${value}`)}
        </span>
      )
    }
  ];

  const tableData = data.length > 0 ? data : sampleData;
  const tableColumns = columns.length > 0 ? columns : sampleColumns;

  // Filter data
  const filteredData = useMemo(() => {
    if (!filterable || Object.keys(filters).length === 0) {
      return tableData;
    }

    return tableData.filter(row => {
      return Object.entries(filters).every(([field, value]) => {
        if (!value) return true;
        const cellValue = row[field];
        return cellValue?.toString().toLowerCase().includes(value.toLowerCase());
      });
    });
  }, [tableData, filters, filterable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortable || !sortField) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection, sortable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) {
      return sortedData;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (field) => {
    if (!sortable) return;

    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(field, newDirection);
    }
  };

  const handleFilter = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
    
    if (onFilter) {
      onFilter(field, value);
    }
  };

  const handleRowClick = (row) => {
    if (onRowClick) {
      onRowClick(row);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm ${className}`} {...props}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm ${className}`} {...props}>
        <div className="p-6 text-center">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-primary)' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`} {...props}>
      {/* Filters */}
      {filterable && (
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tableColumns.filter(col => col.filterable).map(column => (
              <div key={column.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {column.label}
                </label>
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={filters[column.key] || ''}
                  onChange={(e) => handleFilter(column.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontFamily: 'var(--font-primary)' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {tableColumns.map(column => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.width ? '' : 'whitespace-nowrap'
                  } ${sortable && column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  style={{ 
                    width: column.width,
                    fontFamily: 'var(--font-primary)',
                    textAlign: column.align || 'left'
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortable && column.sortable && sortField === column.key && (
                      <span className="text-blue-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr
                key={row.id || index}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => handleRowClick(row)}
              >
                {tableColumns.map(column => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    style={{ 
                      fontFamily: 'var(--font-primary)',
                      textAlign: column.align || 'left'
                    }}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {t('tables.page')} {currentPage} {t('tables.of')} {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('tables.previousPage')}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('tables.nextPage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {paginatedData.length === 0 && (
        <div className="p-6 text-center">
          <div className="text-gray-400 text-4xl mb-2">📋</div>
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-primary)' }}>
            {t('tables.noData')}
          </p>
        </div>
      )}
    </div>
  );
};

export default Table;
