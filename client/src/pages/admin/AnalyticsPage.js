import React from 'react';
import { BarChart2, TrendingUp, Users, Activity } from 'lucide-react';
import AnalyticsDashboard from '../../components/admin/analytics/AnalyticsDashboard';

/**
 * AnalyticsPage Component
 *
 * Main analytics page that provides comprehensive insights into user behavior,
 * system performance, and content engagement through the AnalyticsDashboard.
 *
 * Part of Milestone 2: Analytics Dashboard & User Insights
 *
 * @returns {React.ReactElement} The AnalyticsPage component
 */
const AnalyticsPage = () => {
  return (
    <div className="container-page py-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <BarChart2 className="mr-3 h-8 w-8 text-brand-primary" />
          <div>
            <h1 className="text-heading text-3xl font-bold">
              Analytics Center
            </h1>
            <p className="text-caption text-lg">
              Comprehensive insights and real-time monitoring for your platform
            </p>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="bg-gradient-to-r from-brand-primary/10 to-purple-500/10 rounded-lg p-6 border border-brand-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-brand-primary mr-2" />
                <span className="text-heading font-semibold">
                  User Insights
                </span>
              </div>
              <p className="text-caption text-sm">
                Real-time user activity and engagement metrics
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-6 w-6 text-green-400 mr-2" />
                <span className="text-heading font-semibold">Performance</span>
              </div>
              <p className="text-caption text-sm">
                System health and response time monitoring
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-purple-400 mr-2" />
                <span className="text-heading font-semibold">
                  Growth Trends
                </span>
              </div>
              <p className="text-caption text-sm">
                Content creation and user acquisition trends
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart2 className="h-6 w-6 text-orange-400 mr-2" />
                <span className="text-heading font-semibold">
                  Data Visualization
                </span>
              </div>
              <p className="text-caption text-sm">
                Interactive charts and comparative analysis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Footer Note */}
      <div className="mt-8 text-center">
        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
          <p className="text-caption text-sm">
            ✨ <strong>Milestone 2 Complete:</strong> Advanced analytics
            dashboard with real-time user tracking, comprehensive performance
            metrics, and interactive data visualizations. Data refreshes
            automatically every 30-60 seconds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
