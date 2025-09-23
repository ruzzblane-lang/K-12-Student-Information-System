import { useState, useEffect, useCallback, useMemo } from 'react';
import { yearbookService } from '../services/yearbookApi';

/**
 * Custom hook for Yearbook Portal Widget
 * Provides state management and data fetching logic
 */
export const useYearbookWidget = (schoolId, options = {}) => {
  const {
    initialSearchTerm = '',
    initialFilterYear = '',
    initialSortBy = 'year',
    initialSortOrder = 'desc',
    autoLoad = true,
    cacheResults = true
  } = options;

  // State management
  const [yearbooks, setYearbooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filterYear, setFilterYear] = useState(initialFilterYear);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [selectedYearbook, setSelectedYearbook] = useState(null);
  const [stats, setStats] = useState(null);

  // Cache for results
  const [cache, setCache] = useState(new Map());

  // Memoized cache key
  const cacheKey = useMemo(() => {
    return `${schoolId}-${searchTerm}-${filterYear}-${sortBy}-${sortOrder}`;
  }, [schoolId, searchTerm, filterYear, sortBy, sortOrder]);

  // Load yearbooks
  const loadYearbooks = useCallback(async (forceRefresh = false) => {
    if (!schoolId) return;

    // Check cache first
    if (cacheResults && !forceRefresh && cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      setYearbooks(cachedData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        search: searchTerm,
        year: filterYear,
        sortBy,
        sortOrder
      };

      const data = await yearbookService.getYearbooksBySchool(schoolId, params);
      
      setYearbooks(data);
      
      // Cache results
      if (cacheResults) {
        setCache(prev => new Map(prev).set(cacheKey, data));
      }
    } catch (err) {
      setError(err.message || 'Failed to load yearbooks');
      console.error('Error loading yearbooks:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, searchTerm, filterYear, sortBy, sortOrder, cacheKey, cacheResults, cache]);

  // Load statistics
  const loadStats = useCallback(async () => {
    if (!schoolId) return;

    try {
      const data = await yearbookService.getYearbookStats(schoolId);
      setStats(data);
    } catch (err) {
      console.error('Error loading yearbook stats:', err);
    }
  }, [schoolId]);

  // Search yearbooks
  const searchYearbooks = useCallback(async (searchParams) => {
    if (!schoolId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await yearbookService.searchYearbooks(schoolId, searchParams);
      setYearbooks(data);
    } catch (err) {
      setError(err.message || 'Failed to search yearbooks');
      console.error('Error searching yearbooks:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  // Get recent yearbooks
  const getRecentYearbooks = useCallback(async (limit = 5) => {
    if (!schoolId) return;

    try {
      const data = await yearbookService.getRecentYearbooks(schoolId, limit);
      return data;
    } catch (err) {
      console.error('Error getting recent yearbooks:', err);
      throw err;
    }
  }, [schoolId]);

  // Get featured yearbooks
  const getFeaturedYearbooks = useCallback(async () => {
    if (!schoolId) return;

    try {
      const data = await yearbookService.getFeaturedYearbooks(schoolId);
      return data;
    } catch (err) {
      console.error('Error getting featured yearbooks:', err);
      throw err;
    }
  }, [schoolId]);

  // Get yearbook categories
  const getCategories = useCallback(async () => {
    if (!schoolId) return;

    try {
      const data = await yearbookService.getYearbookCategories(schoolId);
      return data;
    } catch (err) {
      console.error('Error getting yearbook categories:', err);
      throw err;
    }
  }, [schoolId]);

  // Download yearbook
  const downloadYearbook = useCallback(async (yearbookId, format = 'pdf') => {
    try {
      await yearbookService.downloadYearbook(yearbookId, format);
    } catch (err) {
      setError(err.message || 'Failed to download yearbook');
      throw err;
    }
  }, []);

  // Preview yearbook
  const previewYearbook = useCallback(async (yearbookId) => {
    try {
      const previewUrl = await yearbookService.getYearbookPreview(yearbookId);
      return previewUrl;
    } catch (err) {
      setError(err.message || 'Failed to preview yearbook');
      throw err;
    }
  }, []);

  // Handle yearbook selection
  const handleYearbookSelect = useCallback((yearbook) => {
    setSelectedYearbook(yearbook);
    return yearbook;
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedYearbook(null);
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    return loadYearbooks(true);
  }, [loadYearbooks]);

  // Update search term
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  // Update filter year
  const updateFilterYear = useCallback((year) => {
    setFilterYear(year);
  }, []);

  // Update sort options
  const updateSortOptions = useCallback((newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterYear('');
    setSortBy('year');
    setSortOrder('desc');
  }, []);

  // Computed values
  const filteredYearbooks = useMemo(() => {
    return yearbooks.filter(yearbook => {
      const matchesSearch = !searchTerm || 
        yearbook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        yearbook.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYear = !filterYear || yearbook.academic_year === filterYear;
      
      return matchesSearch && matchesYear;
    });
  }, [yearbooks, searchTerm, filterYear]);

  const availableYears = useMemo(() => {
    return [...new Set(yearbooks.map(yb => yb.academic_year))].sort().reverse();
  }, [yearbooks]);

  const yearbookCount = useMemo(() => {
    return {
      total: yearbooks.length,
      filtered: filteredYearbooks.length,
      published: yearbooks.filter(yb => yb.is_published).length,
      draft: yearbooks.filter(yb => !yb.is_published).length
    };
  }, [yearbooks, filteredYearbooks]);

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad && schoolId) {
      loadYearbooks();
      loadStats();
    }
  }, [autoLoad, schoolId, loadYearbooks, loadStats]);

  // Return hook interface
  return {
    // Data
    yearbooks: filteredYearbooks,
    allYearbooks: yearbooks,
    selectedYearbook,
    stats,
    loading,
    error,
    
    // Filters and search
    searchTerm,
    filterYear,
    sortBy,
    sortOrder,
    availableYears,
    
    // Computed values
    yearbookCount,
    
    // Actions
    loadYearbooks,
    searchYearbooks,
    getRecentYearbooks,
    getFeaturedYearbooks,
    getCategories,
    downloadYearbook,
    previewYearbook,
    handleYearbookSelect,
    clearSelection,
    refresh,
    clearCache,
    
    // Filter updates
    updateSearchTerm,
    updateFilterYear,
    updateSortOptions,
    resetFilters,
    
    // State setters (for advanced usage)
    setYearbooks,
    setLoading,
    setError,
    setSelectedYearbook
  };
};

/**
 * Hook for yearbook widget with pagination
 */
export const useYearbookWidgetWithPagination = (schoolId, options = {}) => {
  const {
    itemsPerPage = 12,
    ...restOptions
  } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const widgetHook = useYearbookWidget(schoolId, restOptions);

  const paginatedYearbooks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return widgetHook.yearbooks.slice(startIndex, endIndex);
  }, [widgetHook.yearbooks, currentPage, itemsPerPage]);

  const updateTotalPages = useCallback(() => {
    const pages = Math.ceil(widgetHook.yearbooks.length / itemsPerPage);
    setTotalPages(pages);
    
    // Reset to page 1 if current page is beyond total pages
    if (currentPage > pages && pages > 0) {
      setCurrentPage(1);
    }
  }, [widgetHook.yearbooks.length, itemsPerPage, currentPage]);

  useEffect(() => {
    updateTotalPages();
  }, [updateTotalPages]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    ...widgetHook,
    yearbooks: paginatedYearbooks,
    pagination: {
      currentPage,
      totalPages,
      itemsPerPage,
      goToPage,
      nextPage,
      prevPage,
      resetPagination,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    }
  };
};

/**
 * Hook for yearbook widget with analytics
 */
export const useYearbookWidgetWithAnalytics = (schoolId, options = {}) => {
  const widgetHook = useYearbookWidget(schoolId, options);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadAnalytics = useCallback(async (yearbookId) => {
    if (!yearbookId) return;

    try {
      setAnalyticsLoading(true);
      const data = await yearbookService.getYearbookAnalytics(yearbookId);
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading yearbook analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const trackYearbookView = useCallback(async (yearbookId) => {
    try {
      // Track view event
      await yearbookService.getYearbookAnalytics(yearbookId, { action: 'view' });
    } catch (err) {
      console.error('Error tracking yearbook view:', err);
    }
  }, []);

  const trackYearbookDownload = useCallback(async (yearbookId) => {
    try {
      // Track download event
      await yearbookService.getYearbookAnalytics(yearbookId, { action: 'download' });
    } catch (err) {
      console.error('Error tracking yearbook download:', err);
    }
  }, []);

  return {
    ...widgetHook,
    analytics,
    analyticsLoading,
    loadAnalytics,
    trackYearbookView,
    trackYearbookDownload
  };
};

export default useYearbookWidget;
