import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const AdminLogsDashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  useEffect(() => {
    fetchLogs();
    fetchSystemHealth();
  }, [filters.page, filters.limit]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);

      const response = await api.get(
        `/audit-logs/admin?${queryParams.toString()}`
      );

      setLogs(response.data.data);
      setPagination({
        currentPage: response.data.pagination.page,
        totalPages: response.data.pagination.totalPages,
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to fetch logs. You may not have admin permissions.');
      setLoading(false);

      // If unauthorized, redirect to unauthorized page
      if (err.response && err.response.status === 403) {
        navigate('/unauthorized');
      }
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await api.get('/audit-logs/admin/system-health');
      setSystemHealth(response.data);
    } catch (err) {
      console.error('Error fetching system health:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;

    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  if (loading) return <div className="p-4">Loading logs...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Logs Dashboard</h1>
        <a 
          href="/admin/server-logs" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
        >
          <span className="mr-2">📊</span>
          Live Server Logs
        </a>
      </div>

      {/* System Health Panel */}
      {systemHealth && (
        <div className="mb-8 bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded shadow">
              <h3 className="font-semibold">Request Statistics (24h)</h3>
              <div className="mt-2">
                <p>Total Requests: {systemHealth.stats.totalRequests}</p>
                <p>Successful: {systemHealth.stats.successfulRequests}</p>
                <p>Failed: {systemHealth.stats.failedRequests}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Success Rate:{' '}
                  {systemHealth.stats.totalRequests > 0
                    ? (
                        (systemHealth.stats.successfulRequests /
                          systemHealth.stats.totalRequests) *
                        100
                      ).toFixed(2) + '%'
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-white rounded shadow">
              <h3 className="font-semibold">Server Information</h3>
              <div className="mt-2">
                <p>Uptime: {formatUptime(systemHealth.stats.serverUptime)}</p>
                <p>Node Version: {systemHealth.stats.nodeVersion}</p>
                <p>
                  Memory Usage:{' '}
                  {formatBytes(systemHealth.stats.memoryUsage.rss)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  As of: {formatDate(systemHealth.stats.timestamp)}
                </p>
              </div>
            </div>

            <div className="p-4 bg-white rounded shadow">
              <h3 className="font-semibold">Recent Errors by Type</h3>
              <div className="mt-2">
                {systemHealth.errorsByAction.length > 0 ? (
                  <ul>
                    {systemHealth.errorsByAction.map((item, index) => (
                      <li key={index}>
                        {item._id}: {item.count}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-green-600">No recent errors!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Log Filters</h2>
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <input
              type="text"
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              placeholder="e.g., login, update"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              type="button"
              className="ml-2 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              onClick={() => {
                setFilters({
                  action: '',
                  status: '',
                  startDate: '',
                  endDate: '',
                  page: 1,
                  limit: 50,
                });
                setTimeout(fetchLogs, 0);
              }}
            >
              Clear Filters
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border text-left">Timestamp</th>
              <th className="py-2 px-4 border text-left">Action</th>
              <th className="py-2 px-4 border text-left">Status</th>
              <th className="py-2 px-4 border text-left">User</th>
              <th className="py-2 px-4 border text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr
                  key={log._id}
                  className={log.status === 'failed' ? 'bg-red-50' : ''}
                >
                  <td className="py-2 px-4 border">
                    {formatDate(log.createdAt || log.timestamp)}
                  </td>
                  <td className="py-2 px-4 border">{log.action}</td>
                  <td className="py-2 px-4 border">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 border">
                    {log.user ? `${log.user.name} (${log.user.email})` : 'N/A'}
                  </td>
                  <td className="py-2 px-4 border">
                    {log.details ? (
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    ) : (
                      'No details'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500">
                  No logs found with the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <div>
          Showing page {pagination.currentPage} of {pagination.totalPages}
        </div>
        <div>
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-3 py-1 mr-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogsDashboard;
