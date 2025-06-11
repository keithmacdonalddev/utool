import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react'; // Added useRef
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  List,
  Kanban,
  Plus,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

// Components
import ProjectStatsBar from '../../components/projects/molecules/ProjectStatsBar';
import ProjectFilters from '../../components/projects/molecules/ProjectFilters';
import ProjectGrid from '../../components/projects/views/ProjectGrid';
import ProjectList from '../../components/projects/views/ProjectList';
import ProjectKanban from '../../components/projects/views/ProjectKanban';
import CreateProjectModal from '../../components/projects/organisms/CreateProjectModal';
import DashboardSettingsModal from '../../components/projects/organisms/DashboardSettingsModal';

// Hooks
import useRealTimeProjectUpdates from '../../hooks/useRealTimeProjectUpdates';
import useLocalStoragePersistence, {
  createDashboardState,
  validateDashboardState,
} from '../../hooks/useLocalStoragePersistence';
import logger from '../../utils/logger';

// Redux
import {
  fetchProjects,
  updateProject,
  selectAllProjects,
  selectProjectsLoading,
  selectProjectsError,
} from '../../features/projects/projectsSlice';

/**
 * ProjectDashboard - Main dashboard page for project management
 *
 * This component orchestrates all dashboard functionality including:
 * - Multiple view modes (Grid, List, Kanban)
 * - Real-time updates via Socket.IO
 * - Persistent user preferences
 * - Advanced filtering and searching
 * - Project statistics and analytics
 * - Navigation and project creation
 *
 * Features:
 * - View switching with preserved state
 * - Real-time project updates
 * - Advanced filtering (search, status, priority, category, member)
 * - Sorting by multiple fields
 * - Responsive design for all screen sizes
 * - Error handling and loading states
 * - Accessibility support
 */
const ProjectDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Define queryParams here, possibly from a state or props if dynamic
  // For now, initializing as an empty object if it's meant to be static or populated later.
  const queryParams = useMemo(() => ({}), []); // Or derive from state/props as needed

  // Redux state
  const {
    projects,
    isLoading: projectsLoading,
    error,
  } = useSelector((state) => state.projects);

  // Memoized selector for auth state
  const selectAuth = useMemo(() => (state) => state.auth, []);
  const memoizedAuth = useSelector(selectAuth); // Contains user, token, isGuest, isAuthenticated

  const hasFetchedRef = useRef(false); // Ref to track if initial fetch has been dispatched

  // Calculate currentIsAuthenticated using memoizedAuth and localStorage fallbacks
  const currentIsAuthenticated = useMemo(() => {
    const storageToken = localStorage.getItem('token');
    // Ensure storageUser and storageGuestUser are parsed or null
    let parsedStorageUser = null;
    try {
      const rawStorageUser = localStorage.getItem('user');
      if (rawStorageUser) parsedStorageUser = JSON.parse(rawStorageUser);
    } catch (e) {
      logger.error('Failed to parse storageUser from localStorage:', e);
    }

    let parsedStorageGuestUser = null;
    try {
      const rawStorageGuestUser = localStorage.getItem('guestUser');
      if (rawStorageGuestUser)
        parsedStorageGuestUser = JSON.parse(rawStorageGuestUser);
    } catch (e) {
      logger.error('Failed to parse storageGuestUser from localStorage:', e);
    }

    const effectiveToken = memoizedAuth.token || storageToken;
    const effectiveUser =
      memoizedAuth.user || parsedStorageUser || parsedStorageGuestUser;
    const effectiveIsGuest =
      memoizedAuth.isGuest || (parsedStorageGuestUser && !parsedStorageUser);

    // Log the inputs for isAuthenticated calculation
    if (process.env.NODE_ENV === 'development') {
      logger.debug('ProjectDashboard: currentIsAuthenticated calculation:', {
        memoizedAuthUser: !!memoizedAuth.user,
        memoizedAuthToken: !!memoizedAuth.token,
        memoizedAuthIsGuest: memoizedAuth.isGuest,
        storageToken: !!storageToken,
        parsedStorageUser: !!parsedStorageUser,
        parsedStorageGuestUser: !!parsedStorageGuestUser,
        effectiveUser: !!effectiveUser,
        effectiveToken: !!effectiveToken,
        effectiveIsGuest: effectiveIsGuest,
        result:
          (effectiveUser && effectiveToken) ||
          (effectiveUser && effectiveIsGuest),
      });
    }

    return (
      (effectiveUser && effectiveToken) || (effectiveUser && effectiveIsGuest)
    );
  }, [memoizedAuth]);

  // Local UI state
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Dashboard settings with defaults
  const [dashboardSettings, setDashboardSettings] = useState(() => {
    const saved = localStorage.getItem('dashboard-settings');
    return saved
      ? JSON.parse(saved)
      : {
          autoRefresh: {
            enabled: false,
            interval: 30000, // 30 seconds
          },
          defaultView: 'grid',
          defaultSort: {
            field: 'updatedAt',
            direction: 'desc',
          },
          notifications: {
            showToasts: true,
            showConnectionStatus: true,
            playSound: false,
          },
          display: {
            showProjectStats: true,
            showLastUpdate: true,
            compactMode: false,
            showEmptyStates: true,
          },
        };
  });

  // Persistence hook for dashboard preferences
  const {
    state: dashboardState,
    updateState: updateDashboardState,
    getProperty,
    setProperty,
    isLoaded: preferencesLoaded,
  } = useLocalStoragePersistence(
    'project-dashboard-v1',
    createDashboardState(),
    {
      validateState: validateDashboardState,
      enableLogging: process.env.NODE_ENV === 'development',
      onError: (type, error) => {
        console.error('Dashboard persistence error:', type, error);
      },
    }
  );

  // Real-time updates hook
  const {
    connectionStatus,
    isConnected,
    lastUpdate,
    emitStatusChange,
    errorCount: rtErrorCount,
  } = useRealTimeProjectUpdates({
    enabled: dashboardState.preferences.autoRefresh,
    userId: memoizedAuth.user?._id, // Corrected: Access user from memoizedAuth
  });

  /**
   * Handle manual refresh of projects data
   * Forces a fresh fetch from the server
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchProjects()).unwrap();
    } catch (error) {
      console.error('Error refreshing projects:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  /**
   * Handle view mode change (Grid, List, Kanban)
   * Updates dashboard state and persists preference
   */
  const handleViewChange = useCallback(
    (newMode) => {
      setProperty('view.mode', newMode);
    },
    [setProperty]
  );

  /**
   * Handle filter changes from ProjectFilters component
   * Updates filter state and persists preferences
   */
  const handleFiltersChange = useCallback(
    (newFilters) => {
      updateDashboardState((prevState) => ({
        ...prevState,
        filters: { ...prevState.filters, ...newFilters },
      }));
    },
    [updateDashboardState]
  );

  /**
   * Handle sort changes
   * Updates sort configuration and persists preference
   */
  const handleSortChange = useCallback(
    (field, direction) => {
      updateDashboardState((prevState) => ({
        ...prevState,
        sort: { field, direction },
      }));
    },
    [updateDashboardState]
  );

  /**
   * Handle project click navigation
   * Navigates to project details page
   */ const handleProjectClick = useCallback(
    (project) => {
      // 🚨 OBVIOUS PROJECT CLICK TRACKING LOG 🚨
      if (process.env.NODE_ENV === 'development') {
        console.log('🖱️ ==========================================');
        console.log('🖱️ PROJECT CLICKED ON DASHBOARD (ProjectDashboard)!');
        console.log('🖱️ Project ID:', project._id);
        console.log('🖱️ Project Name:', project.name);
        console.log('🖱️ Timestamp:', new Date().toISOString());
        console.log('🖱️ ==========================================');
      }

      navigate(`/projects/${project._id}`);
    },
    [navigate]
  );

  /**
   * Handle project status change (for Kanban drag-and-drop)
   * Updates project locally and emits real-time update
   */
  const handleProjectStatusChange = useCallback(
    (projectId, newStatus) => {
      // Update project in Redux store
      dispatch(
        updateProject({
          projectId: projectId, // Corrected: 'projectId' instead of 'id'
          updates: { status: newStatus }, // Corrected: 'updates' instead of 'changes'
        })
      );
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `ProjectDashboard: Status changed for ${projectId} to ${newStatus} and emitted.`
        );
      }

      // Emit real-time update to other clients
      emitStatusChange(projectId, newStatus);
    },
    [dispatch, emitStatusChange]
  );

  /**
   * Handle creating new project
   * Opens the create project modal
   */
  const handleCreateProject = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  /**
   * Handle successful project creation
   * Closes modal and refreshes project list
   */
  const handleProjectCreated = useCallback((newProject) => {
    setShowCreateModal(false);
    // The real-time updates hook will automatically update the project list
    // via Socket.IO, so no manual refresh needed
  }, []);

  /**
   * Handle closing create project modal
   */
  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  /**
   * Handle opening settings modal
   */
  const handleOpenSettings = useCallback(() => {
    setShowSettingsModal(true);
  }, []);

  /**
   * Handle closing settings modal
   */
  const handleCloseSettings = useCallback(() => {
    setShowSettingsModal(false);
  }, []);

  /**
   * Handle saving dashboard settings
   * Persists settings to localStorage and updates state
   */
  const handleSaveSettings = useCallback(
    (newSettings) => {
      setDashboardSettings(newSettings);
      localStorage.setItem('dashboard-settings', JSON.stringify(newSettings));

      // Apply any immediate effects from settings
      // Use getProperty to get current state values instead of dashboardState
      const currentViewMode = getProperty('view.mode');
      const currentSortField = getProperty('sort.field');
      const currentSortDirection = getProperty('sort.direction');

      if (newSettings.defaultView !== currentViewMode) {
        handleViewChange(newSettings.defaultView);
      }

      if (
        newSettings.defaultSort.field !== currentSortField ||
        newSettings.defaultSort.direction !== currentSortDirection
      ) {
        handleSortChange(
          newSettings.defaultSort.field,
          newSettings.defaultSort.direction
        );
      }
    },
    [getProperty, handleViewChange, handleSortChange]
  );

  /**
   * Filter and sort projects based on current dashboard state
   * Applies search, status, priority, category, and member filters
   */
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = [...projects];
    const filters = dashboardState.filters;
    const sort = dashboardState.sort;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.name?.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(
        (project) => project.status === filters.status
      );
    }

    // Apply priority filter
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(
        (project) => project.priority === filters.priority
      );
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(
        (project) => project.category === filters.category
      );
    }

    // Apply member filter
    if (filters.member && filters.member !== 'all') {
      filtered = filtered.filter((project) =>
        project.members?.some((member) => member.userId === filters.member)
      );
    }

    // Apply date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter((project) => {
        const createdAt = new Date(project.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sort.field];
      let bValue = b[sort.field];

      // Handle nested properties
      if (sort.field.includes('.')) {
        const keys = sort.field.split('.');
        aValue = keys.reduce((obj, key) => obj?.[key], a);
        bValue = keys.reduce((obj, key) => obj?.[key], b);
      }

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      // Handle dates
      if (sort.field.includes('Date') || sort.field.includes('At')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Sort comparison
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sort.direction === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [
    projects,
    dashboardState.filters.search,
    dashboardState.filters.status,
    dashboardState.filters.priority,
    dashboardState.filters.category,
    dashboardState.filters.member,
    dashboardState.filters.dateRange,
    dashboardState.sort.field,
    dashboardState.sort.direction,
  ]);

  /**
   * Calculate project statistics for the stats bar
   * Provides counts and percentages for dashboard metrics
   */
  const projectStats = useMemo(() => {
    if (!projects) return { total: 0, active: 0, completed: 0, onHold: 0 };

    const total = projects.length;
    const active = projects.filter((p) => p.status === 'active').length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const onHold = projects.filter((p) => p.status === 'on-hold').length;

    return { total, active, completed, onHold };
  }, [projects]);

  /**
   * Render the appropriate view component based on current mode
   * Switches between Grid, List, and Kanban views
   */
  const renderProjectsView = () => {
    const viewMode = dashboardState.view.mode;
    const commonProps = {
      projects: filteredAndSortedProjects,
      isLoading: projectsLoading || !preferencesLoaded,
      onProjectClick: handleProjectClick,
      onCreateProject: handleCreateProject,
      className: 'flex-1',
    };

    switch (viewMode) {
      case 'list':
        return <ProjectList {...commonProps} />;
      case 'kanban':
        return (
          <ProjectKanban
            {...commonProps}
            onStatusChange={handleProjectStatusChange}
          />
        );
      case 'grid':
      default:
        return <ProjectGrid {...commonProps} />;
    }
  };

  /**
   * Load initial projects data on mount
   * Only fetch if no projects are loaded AND user is authenticated
   * Handle the case where Redux state hasn't been restored from localStorage yet
   */
  useEffect(() => {
    // Fallback to localStorage if Redux hasn't been restored yet
    // This logic is now primarily handled by the useMemo for currentIsAuthenticated
    // const storageToken = localStorage.getItem('token');
    // const storageUser = localStorage.getItem('user');
    // const storageGuestUser = localStorage.getItem('guestUser');

    // Determine effective authentication status
    // const effectiveToken = memoizedAuth.token || storageToken;
    // const effectiveUser =
    //   memoizedAuth.user ||
    //   (storageUser ? JSON.parse(storageUser) : null) ||
    //   (storageGuestUser ? JSON.parse(storageGuestUser) : null);
    // const effectiveIsGuest = memoizedAuth.isGuest || (storageGuestUser && !storageUser);

    // This is the single source of truth for isAuthenticated within this effect
    // const localCurrentIsAuthenticated = // This is now the global currentIsAuthenticated from useMemo
    //  (effectiveUser && effectiveToken) || (effectiveUser && effectiveIsGuest);

    if (process.env.NODE_ENV === 'development') {
      logger.debug('ProjectDashboard useEffect triggered:', {
        // Redux state (via memoizedAuth for stability)
        reduxUser: !!memoizedAuth.user,
        reduxToken: !!memoizedAuth.token,
        reduxIsGuest: memoizedAuth.isGuest,
        reduxIsAuthenticated: memoizedAuth.isAuthenticated, // Log Redux's direct version
        // Effective authentication status (now from useMemo)
        currentIsAuthenticated, // Log the calculated version from useMemo
        projects: projects ? `${projects.length} projects` : 'null/undefined',
        isLoading: projectsLoading,
        hasFetched: hasFetchedRef.current,
      });
    }

    const abortController = new AbortController();

    if (
      currentIsAuthenticated && // Use the memoized value
      !projectsLoading &&
      (!projects || projects.length === 0) &&
      !hasFetchedRef.current
    ) {
      if (process.env.NODE_ENV === 'development') {
        logger.info('ProjectDashboard: Dispatching fetchProjects...');
      }
      hasFetchedRef.current = true;
      dispatch(
        fetchProjects({ ...queryParams, signal: abortController.signal })
      );
    } else {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('ProjectDashboard: Skipping fetch because:', {
          notAuthenticated: !currentIsAuthenticated,
          alreadyLoading: projectsLoading,
          projectsAlreadyExist: projects && projects.length > 0,
          fetchAttempted: hasFetchedRef.current,
        });
      }
    }
    return () => {
      abortController.abort();
    };
  }, [
    dispatch,
    currentIsAuthenticated, // Use the memoized value
    projectsLoading,
    projects,
    queryParams,
    // Removed reduxToken, reduxUser, reduxIsGuest, reduxIsAuthenticated as they are covered by currentIsAuthenticated
    // hasFetchedRef is a ref, doesn't need to be in dependency array unless its .current value is used to *conditionally* run the effect, which it is.
    // However, standard practice is to not include refs that are mutated inside the effect.
    // The primary driver for re-running should be actual state/prop changes.
    // Let's keep an eye on this; if hasFetchedRef.current logic needs to trigger re-runs, it's a different pattern.
  ]); // Ensure all dependencies used in calculating currentIsAuthenticated are listed

  /**
   * Connection status indicator component
   * Shows real-time connection status
   */
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <Wifi size={16} className="text-green-500" />
      ) : (
        <WifiOff size={16} className="text-red-500" />
      )}
      <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
        {connectionStatus}
      </span>
      {rtErrorCount > 0 && (
        <span className="text-yellow-500">({rtErrorCount} errors)</span>
      )}
    </div>
  );

  // Show loading state while preferences are loading
  if (!preferencesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check if we're in an initial loading state where Redux hasn't been populated from localStorage yet
  const isStoreInitialized =
    memoizedAuth.user !== undefined || memoizedAuth.token !== undefined;
  // const isAuthenticated = (memoizedAuth.user && memoizedAuth.token) || (memoizedAuth.user && memoizedAuth.isGuest);
  // Use currentIsAuthenticated for consistency
  const isAuthenticated = currentIsAuthenticated;

  // Only show auth loading if store is not initialized AND we have auth data in localStorage
  const hasAuthInStorage =
    localStorage.getItem('user') ||
    localStorage.getItem('token') ||
    localStorage.getItem('guestUser');

  if (!isStoreInitialized && hasAuthInStorage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <ConnectionStatus />
            {lastUpdate && (
              <span className="text-xs text-gray-400">
                Last update:{' '}
                {new Date(lastUpdate.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle Buttons */}
            <div className="flex bg-dark-700 rounded-lg p-1">
              {[
                { mode: 'grid', icon: Grid, label: 'Grid' },
                { mode: 'list', icon: List, label: 'List' },
                { mode: 'kanban', icon: Kanban, label: 'Kanban' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => handleViewChange(mode)}
                  className={`p-2 rounded-md transition-colors ${
                    dashboardState.view.mode === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-600'
                  }`}
                  title={label}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-dark-600 transition-colors disabled:opacity-50"
              title="Refresh Projects"
            >
              <RefreshCw
                size={18}
                className={refreshing ? 'animate-spin' : ''}
              />
            </button>

            {/* Settings Button */}
            <button
              onClick={handleOpenSettings}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
              title="Dashboard Settings"
            >
              <Settings size={18} />
            </button>

            {/* Create Project Button */}
            <button
              onClick={handleCreateProject}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              New Project
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Stats Bar */}
        <div className="px-6 py-4 border-b border-dark-600">
          <ProjectStatsBar
            total={projectStats.total}
            active={projectStats.active}
            completed={projectStats.completed}
            onHold={projectStats.onHold}
          />
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-dark-600">
          <ProjectFilters
            filters={dashboardState.filters}
            onFiltersChange={handleFiltersChange}
            sortField={dashboardState.sort.field}
            sortDirection={dashboardState.sort.direction}
            onSortChange={handleSortChange}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400">Error loading projects: {error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-6">{renderProjectsView()}</div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleProjectCreated}
      />

      {/* Dashboard Settings Modal */}
      <DashboardSettingsModal
        isOpen={showSettingsModal}
        onClose={handleCloseSettings}
        settings={dashboardSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default ProjectDashboard;
