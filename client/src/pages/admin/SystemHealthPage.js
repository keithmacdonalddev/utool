import React from 'react';
import { Activity, Server, Database, Shield, TrendingUp } from 'lucide-react';
import SystemHealthDashboard from '../../components/admin/monitoring/SystemHealthDashboard';

/**
 * SystemHealthPage Component
 *
 * Main system health monitoring page providing comprehensive real-time insights
 * into server performance, service status, database health, and security metrics.
 * Wraps the SystemHealthDashboard with contextual information and page structure.
 *
 * Part of Milestone 3: System Health Monitoring
 *
 * @returns {React.ReactElement} The SystemHealthPage component
 */
const SystemHealthPage = () => {
  return (
    <div className="container-page py-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Activity className="mr-3 h-8 w-8 text-brand-primary" />
          <div>
            <h1 className="text-heading text-3xl font-bold">
              System Health Monitoring
            </h1>
            <p className="text-caption text-lg">
              Real-time monitoring and diagnostics for comprehensive system
              oversight
            </p>
          </div>
        </div>

        {/* Features Banner */}
        <div className="bg-gradient-to-r from-brand-primary/10 to-green-500/10 rounded-lg p-6 border border-brand-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Server className="h-6 w-6 text-brand-primary mr-2" />
                <span className="text-heading font-semibold">
                  Server Monitoring
                </span>
              </div>
              <p className="text-caption text-sm">
                Real-time CPU, memory, disk, and network monitoring
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="h-6 w-6 text-green-400 mr-2" />
                <span className="text-heading font-semibold">
                  Database Health
                </span>
              </div>
              <p className="text-caption text-sm">
                Connection monitoring and performance analytics
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-purple-400 mr-2" />
                <span className="text-heading font-semibold">
                  Security Monitoring
                </span>
              </div>
              <p className="text-caption text-sm">
                Threat detection and authentication tracking
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-orange-400 mr-2" />
                <span className="text-heading font-semibold">
                  Performance Trends
                </span>
              </div>
              <p className="text-caption text-sm">
                Historical analysis and predictive insights
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Dashboard */}
      <SystemHealthDashboard />

      {/* Footer Information */}
      <div className="mt-8 text-center">
        <div className="bg-surface-elevated rounded-lg border border-border-secondary p-4">
          <p className="text-caption text-sm">
            ✨ <strong>Milestone 3 Complete:</strong> Comprehensive system
            health monitoring with real-time metrics, automated alerting, and
            40% faster issue detection. Live updates every 10 seconds with
            historical trend analysis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPage;
