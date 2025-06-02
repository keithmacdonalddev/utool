/**
 * Analytics Service
 *
 * Comprehensive data service for admin analytics functionality.
 * Provides methods for fetching user metrics, system performance data,
 * real-time activity tracking, and guest analytics.
 *
 * Part of Milestone 2: Analytics Dashboard & User Insights
 *
 * @module analyticsService
 */

// Mock data generators for development
// In production, these would be replaced with actual API calls

/**
 * Generate mock user activity data
 * @param {number} days - Number of days to generate data for
 * @returns {Array} Array of daily activity data
 */
const generateUserActivityData = (days = 30) => {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      activeUsers: Math.floor(Math.random() * 150) + 50,
      newUsers: Math.floor(Math.random() * 20) + 5,
      sessions: Math.floor(Math.random() * 300) + 100,
      pageViews: Math.floor(Math.random() * 1000) + 500,
      averageSessionDuration: Math.floor(Math.random() * 300) + 120, // seconds
    });
  }

  return data;
};

/**
 * Generate mock real-time user data
 * @returns {Object} Current real-time metrics
 */
const generateRealTimeData = () => {
  const activities = [
    'Viewing Dashboard',
    'Creating Project',
    'Editing Knowledge Base',
    'Managing Tasks',
    'Browsing Resources',
    'Updating Profile',
    'Reading Notes',
    'Viewing Analytics',
  ];

  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Houston, TX',
    'Phoenix, AZ',
    'Philadelphia, PA',
    'San Antonio, TX',
    'San Diego, CA',
    'Dallas, TX',
    'San Jose, CA',
  ];

  const currentUsers = Math.floor(Math.random() * 50) + 10;
  const activeUsers = [];

  for (let i = 0; i < currentUsers; i++) {
    activeUsers.push({
      id: `user_${i}`,
      activity: activities[Math.floor(Math.random() * activities.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      userType: Math.random() > 0.3 ? 'Registered' : 'Guest',
      sessionDuration: Math.floor(Math.random() * 3600) + 60, // seconds
      lastAction: new Date(Date.now() - Math.random() * 300000), // within last 5 minutes
    });
  }

  return {
    currentUsers,
    activeUsers,
    pageViewsThisHour: Math.floor(Math.random() * 500) + 200,
    bounceRate: (Math.random() * 0.3 + 0.2).toFixed(2), // 20-50%
    averagePageLoadTime: (Math.random() * 2 + 1).toFixed(2), // 1-3 seconds
  };
};

/**
 * Generate mock performance metrics
 * @returns {Object} System performance data
 */
const generatePerformanceMetrics = () => {
  return {
    serverResponse: {
      average: (Math.random() * 200 + 100).toFixed(0), // 100-300ms
      p95: (Math.random() * 400 + 200).toFixed(0), // 200-600ms
      p99: (Math.random() * 800 + 400).toFixed(0), // 400-1200ms
    },
    errorRate: (Math.random() * 0.02).toFixed(3), // 0-2%
    uptime: '99.97%',
    requestsPerMinute: Math.floor(Math.random() * 1000) + 500,
    databaseConnections: Math.floor(Math.random() * 50) + 20,
    memoryUsage: Math.floor(Math.random() * 40) + 40, // 40-80%
    cpuUsage: Math.floor(Math.random() * 30) + 20, // 20-50%
  };
};

/**
 * Generate mock guest analytics data
 * @returns {Object} Guest user metrics
 */
const generateGuestAnalytics = () => {
  const pages = [
    '/dashboard',
    '/projects',
    '/kb',
    '/resources',
    '/notes',
    '/friends',
    '/profile',
  ];

  const referrers = [
    'google.com',
    'github.com',
    'stackoverflow.com',
    'direct',
    'linkedin.com',
    'twitter.com',
    'reddit.com',
  ];

  const topPages = pages.map((page) => ({
    path: page,
    views: Math.floor(Math.random() * 1000) + 100,
    uniqueViews: Math.floor(Math.random() * 800) + 80,
    averageTime: Math.floor(Math.random() * 300) + 60,
  }));

  const topReferrers = referrers.map((referrer) => ({
    source: referrer,
    visits: Math.floor(Math.random() * 500) + 50,
    conversion: (Math.random() * 0.1 + 0.02).toFixed(3), // 2-12%
  }));

  return {
    totalGuestSessions: Math.floor(Math.random() * 5000) + 2000,
    averageSessionDuration: Math.floor(Math.random() * 180) + 120, // 2-5 minutes
    bounceRate: (Math.random() * 0.4 + 0.3).toFixed(2), // 30-70%
    conversionToRegistration: (Math.random() * 0.05 + 0.01).toFixed(3), // 1-6%
    topPages: topPages.sort((a, b) => b.views - a.views).slice(0, 5),
    topReferrers: topReferrers.sort((a, b) => b.visits - a.visits).slice(0, 5),
    deviceBreakdown: {
      desktop: Math.floor(Math.random() * 40) + 40, // 40-80%
      mobile: Math.floor(Math.random() * 40) + 20, // 20-60%
      tablet: Math.floor(Math.random() * 20) + 5, // 5-25%
    },
  };
};

/**
 * Analytics Service API
 */
const analyticsService = {
  /**
   * Fetch user activity data for a given time period
   * @param {Object} options - Query options
   * @param {number} options.days - Number of days to fetch
   * @param {string} options.timeRange - Time range (day, week, month)
   * @returns {Promise<Array>} User activity data
   */
  async getUserActivity(options = { days: 30, timeRange: 'month' }) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return generateUserActivityData(options.days);
  },

  /**
   * Fetch real-time user data
   * @returns {Promise<Object>} Real-time metrics
   */
  async getRealTimeData() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    return generateRealTimeData();
  },

  /**
   * Fetch system performance metrics
   * @returns {Promise<Object>} Performance data
   */
  async getPerformanceMetrics() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return generatePerformanceMetrics();
  },

  /**
   * Fetch guest analytics data
   * @param {Object} options - Query options
   * @param {string} options.timeRange - Time range for data
   * @returns {Promise<Object>} Guest analytics data
   */
  async getGuestAnalytics(options = { timeRange: 'month' }) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    return generateGuestAnalytics();
  },

  /**
   * Fetch user engagement metrics
   * @returns {Promise<Object>} Engagement data
   */
  async getUserEngagement() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 350));

    return {
      dailyActiveUsers: Math.floor(Math.random() * 200) + 100,
      weeklyActiveUsers: Math.floor(Math.random() * 800) + 400,
      monthlyActiveUsers: Math.floor(Math.random() * 2000) + 1000,
      averageSessionsPerUser: (Math.random() * 5 + 2).toFixed(1),
      userRetention: {
        day1: (Math.random() * 0.3 + 0.6).toFixed(2), // 60-90%
        day7: (Math.random() * 0.3 + 0.3).toFixed(2), // 30-60%
        day30: (Math.random() * 0.2 + 0.1).toFixed(2), // 10-30%
      },
      featureUsage: {
        Projects: Math.floor(Math.random() * 80) + 70, // 70-100%
        'Knowledge Base': Math.floor(Math.random() * 60) + 50, // 50-80%
        Notes: Math.floor(Math.random() * 50) + 40, // 40-70%
        Resources: Math.floor(Math.random() * 40) + 30, // 30-60%
        Friends: Math.floor(Math.random() * 30) + 20, // 20-40%
      },
    };
  },

  /**
   * Fetch content analytics
   * @returns {Promise<Object>} Content performance data
   */
  async getContentAnalytics() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      totalProjects: Math.floor(Math.random() * 500) + 300,
      totalKnowledgeBase: Math.floor(Math.random() * 200) + 150,
      totalNotes: Math.floor(Math.random() * 1000) + 800,
      totalTasks: Math.floor(Math.random() * 2000) + 1500,
      contentGrowth: {
        projects: (Math.random() * 20 + 5).toFixed(1), // 5-25% growth
        kb: (Math.random() * 15 + 3).toFixed(1), // 3-18% growth
        notes: (Math.random() * 30 + 10).toFixed(1), // 10-40% growth
        tasks: (Math.random() * 25 + 8).toFixed(1), // 8-33% growth
      },
      popularCategories: [
        { name: 'Development', count: Math.floor(Math.random() * 100) + 50 },
        { name: 'Research', count: Math.floor(Math.random() * 80) + 40 },
        { name: 'Documentation', count: Math.floor(Math.random() * 60) + 30 },
        { name: 'Planning', count: Math.floor(Math.random() * 40) + 20 },
        { name: 'Learning', count: Math.floor(Math.random() * 50) + 25 },
      ].sort((a, b) => b.count - a.count),
    };
  },
};

export default analyticsService;
