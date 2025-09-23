/**
 * Yearbook Page
 * 
 * Yearbook page with photo galleries, signatures, and memories.
 * Supports photo upload, viewing, and sharing functionality.
 * 
 * API Endpoints:
 * - GET /api/yearbook/photos - Fetch yearbook photos
 * - GET /api/yearbook/signatures - Fetch signatures
 * - GET /api/yearbook/memories - Fetch memories
 * - POST /api/yearbook/upload - Upload photos
 * - POST /api/yearbook/signatures - Add signature
 * - GET /api/yearbook/export - Export yearbook
 * 
 * Expected Data Structure:
 * {
 *   "photos": [...],
 *   "signatures": [...],
 *   "memories": [...],
 *   "sections": [...]
 * }
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';

const YearbookPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [photos, setPhotos] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [memories, setMemories] = useState([]);
  const [sections, setSections] = useState([]);

  // Mock data for demonstration
  const mockPhotos = [
    { id: 1, title: 'First Day of School', date: '2024-08-15', section: 'Events', uploader: 'Ms. Smith', likes: 45, tags: ['first-day', 'students', 'excitement'] },
    { id: 2, title: 'Homecoming Game', date: '2024-09-20', section: 'Sports', uploader: 'Coach Wilson', likes: 78, tags: ['football', 'homecoming', 'victory'] },
    { id: 3, title: 'Science Fair Winners', date: '2024-10-05', section: 'Academics', uploader: 'Dr. Brown', likes: 32, tags: ['science', 'achievement', 'winners'] },
    { id: 4, title: 'Art Exhibition', date: '2024-10-15', section: 'Arts', uploader: 'Ms. Garcia', likes: 56, tags: ['art', 'creativity', 'exhibition'] },
    { id: 5, title: 'Graduation Ceremony', date: '2024-05-25', section: 'Graduation', uploader: 'Principal Johnson', likes: 120, tags: ['graduation', 'ceremony', 'achievement'] }
  ];

  const mockSignatures = [
    { id: 1, author: 'Sarah Johnson', message: 'Had an amazing year! Thanks for all the memories!', date: '2024-01-10', likes: 12 },
    { id: 2, author: 'Mike Chen', message: 'Best year ever! Can\'t wait for next year!', date: '2024-01-09', likes: 8 },
    { id: 3, author: 'Emma Davis', message: 'Thanks to all my teachers and friends!', date: '2024-01-08', likes: 15 },
    { id: 4, author: 'Alex Rodriguez', message: 'Great memories, great friends, great year!', date: '2024-01-07', likes: 6 }
  ];

  const mockMemories = [
    { id: 1, title: 'First Day Jitters', content: 'Remember when we were all nervous on the first day?', author: 'Ms. Smith', date: '2024-08-15', type: 'story' },
    { id: 2, title: 'The Big Game', content: 'Our football team won the championship!', author: 'Coach Wilson', date: '2024-09-20', type: 'achievement' },
    { id: 3, title: 'Science Fair Success', content: 'Three of our students won regional science fair awards.', author: 'Dr. Brown', date: '2024-10-05', type: 'achievement' },
    { id: 4, title: 'Art Show Opening', content: 'The art exhibition was a huge success!', author: 'Ms. Garcia', date: '2024-10-15', type: 'event' }
  ];

  const mockSections = [
    { id: 1, name: 'Events', count: 25, description: 'School events and activities' },
    { id: 2, name: 'Sports', count: 18, description: 'Athletic achievements and games' },
    { id: 3, name: 'Academics', count: 32, description: 'Academic achievements and competitions' },
    { id: 4, name: 'Arts', count: 15, description: 'Art exhibitions and performances' },
    { id: 5, name: 'Graduation', count: 8, description: 'Graduation ceremonies and celebrations' }
  ];

  useEffect(() => {
    const loadYearbookData = async () => {
      setLoading(true);
      try {
        // Simulate API calls
        setTimeout(() => {
          setPhotos(mockPhotos);
          setSignatures(mockSignatures);
          setMemories(mockMemories);
          setSections(mockSections);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to load yearbook data:', error);
        setLoading(false);
      }
    };

    loadYearbookData();
  }, []);

  const photoColumns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'section', label: 'Section', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'uploader', label: 'Uploader', sortable: true },
    { key: 'likes', label: 'Likes', sortable: true },
    { 
      key: 'tags', 
      label: 'Tags', 
      render: (tags) => (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <Badge key={index} variant="info" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      )
    }
  ];

  const signatureColumns = [
    { key: 'author', label: 'Author', sortable: true },
    { key: 'message', label: 'Message', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'likes', label: 'Likes', sortable: true }
  ];

  const memoryColumns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'content', label: 'Content', sortable: true },
    { key: 'author', label: 'Author', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { 
      key: 'type', 
      label: 'Type', 
      sortable: true,
      render: (type) => (
        <Badge 
          variant={type === 'achievement' ? 'success' : type === 'event' ? 'info' : 'default'}
        >
          {type}
        </Badge>
      )
    }
  ];

  const tabs = [
    { id: 'photos', label: t('yearbook.photos'), icon: '📸', count: photos.length },
    { id: 'signatures', label: t('yearbook.signatures'), icon: '✍️', count: signatures.length },
    { id: 'memories', label: t('yearbook.memories'), icon: '💭', count: memories.length },
    { id: 'sections', label: 'Sections', icon: '📁', count: sections.length }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'photos':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Photo Gallery</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {t('yearbook.upload')}
              </button>
            </div>
            <Table
              data={photos}
              columns={photoColumns}
              loading={loading}
            />
          </div>
        );
      case 'signatures':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Signatures</h3>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Add Signature
              </button>
            </div>
            <Table
              data={signatures}
              columns={signatureColumns}
              loading={loading}
            />
          </div>
        );
      case 'memories':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Memories</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Add Memory
              </button>
            </div>
            <Table
              data={memories}
              columns={memoryColumns}
              loading={loading}
            />
          </div>
        );
      case 'sections':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Yearbook Sections</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map(section => (
                <Card
                  key={section.id}
                  title={section.name}
                  subtitle={section.description}
                  variant="elevated"
                  onClick={() => setActiveTab('photos')}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">{section.count}</span>
                    <span className="text-sm text-gray-500">photos</span>
                  </div>
                </Card>
              ))}
            </div>
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
              {t('yearbook.title')}
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily: 'var(--font-secondary)' }}>
              {t('yearbook.currentYear')} - Capture and share your school memories
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="info" icon="📖">
              {t('yearbook.currentYear')}
            </Badge>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('yearbook.download')}
            </button>
          </div>
        </div>
      </div>

      {/* Yearbook Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          title="Total Photos"
          icon="📸"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-blue-600">{photos.length}</div>
          <div className="text-sm text-gray-500 mt-1">Photos uploaded</div>
        </Card>
        <Card
          title="Signatures"
          icon="✍️"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-green-600">{signatures.length}</div>
          <div className="text-sm text-gray-500 mt-1">Messages written</div>
        </Card>
        <Card
          title="Memories"
          icon="💭"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-purple-600">{memories.length}</div>
          <div className="text-sm text-gray-500 mt-1">Stories shared</div>
        </Card>
        <Card
          title="Sections"
          icon="📁"
          variant="elevated"
          loading={loading}
        >
          <div className="text-3xl font-bold text-orange-600">{sections.length}</div>
          <div className="text-sm text-gray-500 mt-1">Categories</div>
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
            <div className="text-2xl mb-2">📸</div>
            <div className="font-medium text-gray-900">{t('yearbook.upload')}</div>
            <div className="text-sm text-gray-500">Add Photos</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
            <div className="text-2xl mb-2">✍️</div>
            <div className="font-medium text-gray-900">Sign</div>
            <div className="text-sm text-gray-500">Add Signature</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">💭</div>
            <div className="font-medium text-gray-900">Memory</div>
            <div className="text-sm text-gray-500">Share Story</div>
          </button>
          <button className="p-4 text-center rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors">
            <div className="text-2xl mb-2">📖</div>
            <div className="font-medium text-gray-900">{t('yearbook.view')}</div>
            <div className="text-sm text-gray-500">View Yearbook</div>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default YearbookPage;
