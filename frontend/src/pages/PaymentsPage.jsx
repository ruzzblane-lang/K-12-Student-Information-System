/**
 * Payments Page
 * 
 * Payments page for managing tuition, fees, and other school payments.
 * Displays outstanding balances, payment history, and payment methods.
 * 
 * API Endpoints:
 * - GET /api/payments/outstanding - Outstanding payments
 * - GET /api/payments/history - Payment history
 * - GET /api/payments/methods - Payment methods
 * - GET /api/payments/invoices - Invoices
 * - POST /api/payments/process - Process payment
 * - POST /api/payments/schedule - Schedule payment
 * 
 * Expected Data Structure:
 * {
 *   "outstanding": [...],
 *   "history": [...],
 *   "methods": [...],
 *   "invoices": [...],
 *   "summary": {...}
 * }
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Chart from '../components/ui/Chart';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import Notification from '../components/ui/Notification';

const PaymentsPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outstanding');
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [methods, setMethods] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});

  // Mock data for demonstration
  const mockOutstanding = [
    { id: 1, description: 'Tuition - Spring 2024', amount: 2500.00, dueDate: '2024-02-15', status: 'overdue', type: 'tuition' },
    { id: 2, description: 'Books & Supplies', amount: 350.00, dueDate: '2024-02-20', status: 'pending', type: 'books' },
    { id: 3, description: 'Activity Fee', amount: 150.00, dueDate: '2024-02-25', status: 'pending', type: 'activities' },
    { id: 4, description: 'Meal Plan', amount: 800.00, dueDate: '2024-03-01', status: 'pending', type: 'meals' },
    { id: 5, description: 'Transportation', amount: 200.00, dueDate: '2024-03-05', status: 'pending', type: 'transportation' }
  ];

  const mockHistory = [
    { id: 1, description: 'Tuition - Fall 2023', amount: 2500.00, paidDate: '2023-08-15', method: 'Credit Card', status: 'paid', reference: 'TXN-001' },
    { id: 2, description: 'Books & Supplies', amount: 320.00, paidDate: '2023-08-20', method: 'Bank Transfer', status: 'paid', reference: 'TXN-002' },
    { id: 3, description: 'Activity Fee', amount: 150.00, paidDate: '2023-09-01', method: 'Credit Card', status: 'paid', reference: 'TXN-003' },
    { id: 4, description: 'Meal Plan', amount: 750.00, paidDate: '2023-09-05', method: 'Check', status: 'paid', reference: 'TXN-004' },
    { id: 5, description: 'Late Fee', amount: 25.00, paidDate: '2023-10-01', method: 'Credit Card', status: 'paid', reference: 'TXN-005' }
  ];

  const mockMethods = [
    { id: 1, type: 'Credit Card', last4: '**** 1234', expiry: '12/25', isDefault: true, status: 'active' },
    { id: 2, type: 'Bank Account', last4: '**** 5678', bank: 'Chase Bank', isDefault: false, status: 'active' },
    { id: 3, type: 'Check', description: 'Mailed check payments', isDefault: false, status: 'active' }
  ];

  const mockInvoices = [
    { id: 1, invoiceNumber: 'INV-001', date: '2024-01-15', dueDate: '2024-02-15', amount: 2500.00, status: 'overdue', description: 'Tuition - Spring 2024' },
    { id: 2, invoiceNumber: 'INV-002', date: '2024-01-20', dueDate: '2024-02-20', amount: 350.00, status: 'pending', description: 'Books & Supplies' },
    { id: 3, invoiceNumber: 'INV-003', date: '2024-01-25', dueDate: '2024-02-25', amount: 150.00, status: 'pending', description: 'Activity Fee' }
  ];

  const mockSummary = {
    totalOutstanding: 4000.00,
    totalPaid: 3745.00,
    overdueAmount: 2500.00,
    nextDueDate: '2024-02-15',
    paymentMethods: 3,
    lastPayment: '2023-10-01'
  };

  useEffect(() => {
    const loadPaymentsData = async () => {
      setLoading(true);
      try {
        // Simulate API calls
        setTimeout(() => {
          setOutstanding(mockOutstanding);
          setHistory(mockHistory);
          setMethods(mockMethods);
          setInvoices(mockInvoices);
          setSummary(mockSummary);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to load payments data:', error);
        setLoading(false);
      }
    };

    loadPaymentsData();
  }, []);

  const outstandingColumns = [
    { key: 'description', label: 'Description', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, render: (value) => `$${value.toFixed(2)}` },
    { key: 'dueDate', label: 'Due Date', sortable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true,
      render: (value) => (
        <Badge 
          variant={value === 'overdue' ? 'error' : 'warning'}
        >
          {value}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, row) => (
        <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          {t('payments.payNow')}
        </button>
      )
    }
  ];

  const historyColumns = [
    { key: 'description', label: 'Description', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, render: (value) => `$${value.toFixed(2)}` },
    { key: 'paidDate', label: 'Paid Date', sortable: true },
    { key: 'method', label: 'Method', sortable: true },
    { key: 'reference', label: 'Reference', sortable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true,
      render: (value) => (
        <Badge variant="success">
          {value}
        </Badge>
      )
    }
  ];

  const methodColumns = [
    { key: 'type', label: 'Type', sortable: true },
    { key: 'details', label: 'Details', render: (_, row) => {
      if (row.type === 'Credit Card') {
        return `${row.last4} (Expires ${row.expiry})`;
      } else if (row.type === 'Bank Account') {
        return `${row.last4} - ${row.bank}`;
      } else {
        return row.description || row.type;
      }
    }},
    { 
      key: 'isDefault', 
      label: 'Default', 
      render: (value) => value ? <Badge variant="success">Yes</Badge> : <Badge variant="default">No</Badge>
    },
    { 
      key: 'status', 
      label: t('tables.status'), 
      render: (value) => (
        <Badge variant={value === 'active' ? 'success' : 'default'}>
          {value}
        </Badge>
      )
    }
  ];

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, render: (value) => `$${value.toFixed(2)}` },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'dueDate', label: 'Due Date', sortable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true,
      render: (value) => (
        <Badge 
          variant={value === 'overdue' ? 'error' : value === 'paid' ? 'success' : 'warning'}
        >
          {value}
        </Badge>
      )
    }
  ];

  const tabs = [
    { id: 'outstanding', label: t('payments.outstanding'), icon: '⚠️', count: outstanding.length },
    { id: 'history', label: t('payments.history'), icon: '📊', count: history.length },
    { id: 'methods', label: t('payments.methods'), icon: '💳', count: methods.length },
    { id: 'invoices', label: t('payments.invoices'), icon: '📄', count: invoices.length }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'outstanding':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Outstanding Payments</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Pay All
              </button>
            </div>
            <Table
              data={outstanding}
              columns={outstandingColumns}
              loading={loading}
            />
          </div>
        );
      case 'history':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Export
              </button>
            </div>
            <Table
              data={history}
              columns={historyColumns}
              loading={loading}
            />
          </div>
        );
      case 'methods':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Add Method
              </button>
            </div>
            <Table
              data={methods}
              columns={methodColumns}
              loading={loading}
            />
          </div>
        );
      case 'invoices':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                Download All
              </button>
            </div>
            <Table
              data={invoices}
              columns={invoiceColumns}
              loading={loading}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const paymentChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Payments Made',
      data: [2500, 320, 150, 750, 25, 0],
      backgroundColor: 'var(--color-success, #10B981)',
      borderColor: 'var(--color-success, #10B981)',
      tension: 0.4
    }, {
      label: 'Outstanding',
      data: [0, 0, 0, 0, 0, 4000],
      backgroundColor: 'var(--color-error, #EF4444)',
      borderColor: 'var(--color-error, #EF4444)',
      tension: 0.4
    }]
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
              {t('payments.title')}
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily: 'var(--font-secondary)' }}>
              Manage your school payments and fees
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="warning" icon="⚠️">
              ${summary.overdueAmount?.toFixed(2)} Overdue
            </Badge>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('payments.payNow')}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          title="Total Outstanding"
          icon="💰"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-red-600">${summary.totalOutstanding?.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">Amount due</div>
        </Card>
        <Card
          title="Total Paid"
          icon="✅"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-green-600">${summary.totalPaid?.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">This year</div>
        </Card>
        <Card
          title="Overdue Amount"
          icon="⚠️"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-orange-600">${summary.overdueAmount?.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">Past due</div>
        </Card>
        <Card
          title="Next Due Date"
          icon="📅"
          variant="elevated"
          loading={loading}
        >
          <div className="text-2xl font-bold text-blue-600">{summary.nextDueDate}</div>
          <div className="text-sm text-gray-500 mt-1">Upcoming payment</div>
        </Card>
      </div>

      {/* Payment Chart */}
      <Chart
        type="bar"
        title="Payment History"
        subtitle="Monthly payment trends"
        data={paymentChartData}
        loading={loading}
      />

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                <Badge variant="info" size="sm">{tab.count}</Badge>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Quick Actions */}
      <Card
        title="Quick Actions"
        icon="⚡"
        variant="outlined"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <div className="text-2xl mb-2">💳</div>
            <div className="font-medium text-gray-900">{t('payments.payNow')}</div>
            <div className="text-sm text-gray-500">Make Payment</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
            <div className="text-2xl mb-2">📅</div>
            <div className="font-medium text-gray-900">{t('payments.schedulePayment')}</div>
            <div className="text-sm text-gray-500">Schedule Later</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">💳</div>
            <div className="font-medium text-gray-900">{t('payments.methods')}</div>
            <div className="text-sm text-gray-500">Manage Methods</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium text-gray-900">{t('payments.receipts')}</div>
            <div className="text-sm text-gray-500">View Receipts</div>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default PaymentsPage;
