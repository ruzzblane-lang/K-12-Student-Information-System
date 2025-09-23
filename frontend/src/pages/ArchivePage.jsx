/**
 * Archive Page
 * 
 * Archive page for accessing historical records, documents, and media.
 * Provides search and filtering capabilities for archived content.
 * 
 * API Endpoints:
 * - GET /api/archive/search - Search archived content
 * - GET /api/archive/students - Archived student records
 * - GET /api/archive/transcripts - Archived transcripts
 * - GET /api/archive/documents - Archived documents
 * - GET /api/archive/media - Archived media files
 * - GET /api/archive/export - Export archived data
 * 
 * Expected Data Structure:
 * {
 *   "records": [...],
 *   "documents": [...],
   "media": [...],
   "transcripts": [...],
   "filters": {...}
 * }
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';

const ArchivePage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [records, setRecords] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [media, setMedia] = useState([]);
  const [transcripts, setTranscripts] = useState([]);

  // Mock data for demonstration
  const mockRecords = [
    { id: 1, name: 'John Smith', type: 'student', year: '2023', grade: '12', status: 'graduated', lastUpdated: '2023-06-15' },
    { id: 2, name: 'Sarah Johnson', type: 'student', year: '2023', grade: '12', status: 'graduated', lastUpdated: '2023-06-15' },
    { id: 3, name: 'Mike Chen', type: 'student', year: '2022', grade: '12', status: 'graduated', lastUpdated: '2022-06-15' },
    { id: 4, name: 'Emma Davis', type: 'student', year: '2023', grade: '11', status: 'transferred', lastUpdated: '2023-08-20' },
    { id: 5, name: 'Alex Rodriguez', type: 'student', year: '2022', grade: '12', status: 'graduated', lastUpdated: '2022-06-15' }
  ];

  const mockDocuments = [
    { id: 1, title: 'Academic Transcript - John Smith', type: 'transcript', year: '2023', size: '2.5 MB', format: 'PDF', created: '2023-06-15' },
    { id: 2, title: 'Disciplinary Record - Sarah Johnson', type: 'disciplinary', year: '2023', size: '1.2 MB', format: 'PDF', created: '2023-05-20' },
    { id: 3, title: 'Medical Records - Mike Chen', type: 'medical', year: '2022', size: '3.1 MB', format: 'PDF', created: '2022-08-10' },
    { id: 4, title: 'Parent Communication Log', type: 'communication', year: '2023', size: '4.2 MB', format: 'PDF', created: '2023-07-05' },
    { id: 5, title: 'Emergency Contact Forms', type: 'emergency', year: '2023', size: '1.8 MB', format: 'PDF', created: '2023-08-15' }
  ];

  const mockMedia = [
    { id: 1, title: 'Graduation Ceremony 2023', type: 'video', year: '2023', size: '125 MB', format: 'MP4', duration: '45:30', created: '2023-06-15' },
    { id: 2, title: 'Class Photo - Grade 12', type: 'image', year: '2023', size: '8.5 MB', format: 'JPG', resolution: '4000x3000', created: '2023-05-20' },
    { id: 3, title: 'Science Fair Presentation', type: 'video', year: '2023', size: '67 MB', format: 'MP4', duration: '22:15', created: '2023-04-10' },
    { id: 4, title: 'Art Exhibition Photos', type: 'image', year: '2023', size: '15.2 MB', format: 'JPG', resolution: '3000x2000', created: '2023-03-25' },
    { id: 5, title: 'Sports Day Highlights', type: 'video', year: '2022', size: '89 MB', format: 'MP4', duration: '32:45', created: '2022-09-15' }
  ];

  const mockTranscripts = [
    { id: 1, studentName: 'John Smith', year: '2023', gpa: 3.85, credits: 24, status: 'final', created: '2023-06-15' },
    { id: 2, studentName: 'Sarah Johnson', year: '2023', gpa: 3.92, credits: 24, status: 'final', created: '2023-06-15' },
    { id: 3, studentName: 'Mike Chen', year: '2022', gpa: 3.78, credits: 24, status: 'final', created: '2022-06-15' },
    { id: 4, studentName: 'Emma Davis', year: '2023', gpa: 3.65, credits: 18, status: 'partial', created: '2023-08-20' },
    { id: 5, studentName: 'Alex Rodriguez', year: '2022', gpa: 3.88, credits: 24, status: 'final', created: '2022-06-15' }
  ];

  useEffect(() => {
    const loadArchiveData = async () => {
      setLoading(true);
      try {
        // Simulate API calls
        setTimeout(() => {
          setRecords(mockRecords);
          setDocuments(mockDocuments);
          setMedia(mockMedia);
          setTranscripts(mockTranscripts);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to load archive data:', error);
        setLoading(false);
      }
    };

    loadArchiveData();
  }, []);

  const recordColumns = [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'type', label: 'Type', sortable: true, filterable: true },
    { key: 'year', label: 'Year', sortable: true, filterable: true },
    { key: 'grade', label: 'Grade', sortable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true,
      render: (value) => (
        <Badge 
          variant={value === 'graduated' ? 'success' : value === 'transferred' ? 'warning' : 'default'}
        >
          {value}
        </Badge>
      )
    },
    { key: 'lastUpdated', label: 'Last Updated', sortable: true },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, row) => (
        <div className="flex space-x-2">
          <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
            {t('common.view')}
          </button>
          <button className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
            {t('common.download')}
          </button>
        </div>
      )
    }
  ];

  const documentColumns = [
    { key: 'title', label: 'Title', sortable: true, filterable: true },
    { key: 'type', label: 'Type', sortable: true, filterable: true },
    { key: 'year', label: 'Year', sortable: true, filterable: true },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'format', label: 'Format', sortable: true },
    { key: 'created', label: 'Created', sortable: true },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, row) => (
        <div className="flex space-x-2">
          <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
            {t('common.view')}
          </button>
          <button className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
            {t('common.download')}
          </button>
        </div>
      )
    }
  ];

  const mediaColumns = [
    { key: 'title', label: 'Title', sortable: true, filterable: true },
    { key: 'type', label: 'Type', sortable: true, filterable: true },
    { key: 'year', label: 'Year', sortable: true, filterable: true },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'format', label: 'Format', sortable: true },
    { key: 'details', label: 'Details', render: (_, row) => {
      if (row.type === 'video') {
        return `Duration: ${row.duration}`;
      } else if (row.type === 'image') {
        return `Resolution: ${row.resolution}`;
      }
      return '-';
    }},
    { key: 'created', label: 'Created', sortable: true },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, row) => (
        <div className="flex space-x-2">
          <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
            {t('common.view')}
          </button>
          <button className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
            {t('common.download')}
          </button>
        </div>
      )
    }
  ];

  const transcriptColumns = [
    { key: 'studentName', label: 'Student', sortable: true, filterable: true },
    { key: 'year', label: 'Year', sortable: true, filterable: true },
    { key: 'gpa', label: 'GPA', sortable: true },
    { key: 'credits', label: 'Credits', sortable: true },
    { 
      key: 'status', 
      label: t('tables.status'), 
      sortable: true,
      render: (value) => (
        <Badge 
          variant={value === 'final' ? 'success' : 'warning'}
        >
          {value}
        </Badge>
      )
    },
    { key: 'created', label: 'Created', sortable: true },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, row) => (
        <div className="flex space-x-2">
          <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
            {t('common.view')}
          </button>
          <button className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
            {t('common.download')}
          </button>
        </div>
      )
    }
  ];

  const tabs = [
    { id: 'records', label: t('archive.studentRecords'), icon: '👨‍🎓', count: records.length },
    { id: 'documents', label: t('archive.documents'), icon: '📄', count: documents.length },
    { id: 'media', label: t('archive.photos'), icon: '📸', count: media.length },
    { id: 'transcripts', label: t('archive.transcripts'), icon: '📊', count: transcripts.length }
  ];

  const years = ['2024', '2023', '2022', '2021', '2020'];
  const types = ['student', 'teacher', 'administrator', 'staff'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'records':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Student Records</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {t('common.export')}
              </button>
            </div>
            <Table
              data={records}
              columns={recordColumns}
              loading={loading}
            />
          </div>
        );
      case 'documents':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                {t('common.download')} All
              </button>
            </div>
            <Table
              data={documents}
              columns={documentColumns}
              loading={loading}
            />
          </div>
        );
      case 'media':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Media Files</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                {t('common.download')} All
              </button>
            </div>
            <Table
              data={media}
              columns={mediaColumns}
              loading={loading}
            />
          </div>
        );
      case 'transcripts':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Academic Transcripts</h3>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                {t('common.export')}
              </button>
            </div>
            <Table
              data={transcripts}
              columns={transcriptColumns}
              loading={loading}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-primary)' }}>
              {t('archive.title')}
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily: 'var(--font-secondary)' }}>
              Access historical records, documents, and media
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="info" icon="📁">
              {records.length + documents.length + media.length + transcripts.length} Items
            </Badge>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('common.export')}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card
        title={t('archive.search')}
        icon="🔍"
        variant="outlined"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Term
            </label>
            <input
              type="text"
              placeholder="Search archive..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              {t('common.search')}
            </button>
          </div>
        </div>
      </Card>

      {/* Archive Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          title="Student Records"
          icon="👨‍🎓"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-blue-600">{records.length}</div>
          <div className="text-sm text-gray-500 mt-1">Archived records</div>
        </Card>
        <Card
          title="Documents"
          icon="📄"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-green-600">{documents.length}</div>
          <div className="text-sm text-gray-500 mt-1">PDF documents</div>
        </Card>
        <Card
          title="Media Files"
          icon="📸"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-purple-600">{media.length}</div>
          <div className="text-sm text-gray-500 mt-1">Photos & videos</div>
        </Card>
        <Card
          title="Transcripts"
          icon="📊"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-orange-600">{transcripts.length}</div>
          <div className="text-sm text-gray-500 mt-1">Academic records</div>
        </Card>
      </div>

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
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-medium text-gray-900">{t('archive.search')}</div>
            <div className="text-sm text-gray-500">Search Archive</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
            <div className="text-2xl mb-2">📥</div>
            <div className="font-medium text-gray-900">{t('common.download')}</div>
            <div className="text-sm text-gray-500">Download Files</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">📤</div>
            <div className="font-medium text-gray-900">{t('common.export')}</div>
            <div className="text-sm text-gray-500">Export Data</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
            <div className="text-2xl mb-2">🖨️</div>
            <div className="font-medium text-gray-900">{t('common.print')}</div>
            <div className="text-sm text-gray-500">Print Records</div>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default ArchivePage;
