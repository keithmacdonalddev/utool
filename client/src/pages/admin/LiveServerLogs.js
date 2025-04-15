import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import socket, { connectWithAuth } from '../../utils/socket';

const LiveServerLogs = () => {
  const navigate = useNavigate();
  const logContainerRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [filter, setFilter] = useState({
    info: true,
    warn: true,
    error: true,
    debug: false,
    search: '',
  });
  
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);

  useEffect(() => {
    // Only admin users should be able to access this
    if (!user || user.role !== 'Admin') {
      navigate('/unauthorized');
      return;
    }

    // Connect to socket with authentication if we have a token
    if (token) {
      const connected = connectWithAuth();
      if (!connected) {
        setConnectionError('Failed to connect: No authentication token');
      }
    } else {
      setConnectionError('Authentication token not available');
    }

    // Join the admin-logs room
    if (socket.connected) {
      socket.emit('join-admin-logs');
    }

    // Listen for connection events
    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('Connected to server for logs streaming');
      socket.emit('join-admin-logs'); // Join room on connection/reconnection
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from server logs streaming');
    };

    const onConnectError = (error) => {
      setConnectionError(`Connection error: ${error.message}`);
      console.error('Socket connection error:', error);
    };

    const onUnauthorized = (error) => {
      setConnectionError(`Authentication error: ${error.message}`);
      console.error('Socket authorization failed:', error);
    };

    // Listen for logs history (initial logs)
    const onLogsHistory = (history) => {
      setLogs(history);
    };

    // Listen for new logs
    const onServerLog = (logEntry) => {
      setLogs((prevLogs) => [logEntry, ...prevLogs].slice(0, 1000)); // Limit to 1000 logs
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('unauthorized', onUnauthorized);
    socket.on('logs-history', onLogsHistory);
    socket.on('server-log', onServerLog);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('unauthorized', onUnauthorized);
      socket.off('logs-history', onLogsHistory);
      socket.off('server-log', onServerLog);
    };
  }, [navigate, user, token]);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // Filter logs based on current filter settings
  const filteredLogs = logs.filter((log) => {
    // Type filter
    if (!filter[log.type]) return false;

    // Search text filter
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) {
      // Also check in data if it exists
      if (!log.data || (typeof log.data === 'object' && !JSON.stringify(log.data).toLowerCase().includes(filter.search.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });

  // Format log timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get style for log type
  const getLogTypeStyle = (type) => {
    switch (type) {
      case 'error': return 'text-red-600 font-semibold';
      case 'warn': return 'text-amber-600 font-semibold';
      case 'debug': return 'text-purple-600';
      default: return 'text-blue-600'; // info
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Try to reconnect
  const handleReconnect = () => {
    connectWithAuth();
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Live Server Logs</h1>
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          {!isConnected && (
            <button 
              onClick={handleReconnect}
              className="ml-3 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {connectionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {connectionError}
        </div>
      )}

      {/* Filter controls */}
      <div className="bg-gray-100 p-3 rounded-lg mb-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4 mb-2 md:mb-0">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={filter.info}
                onChange={() => setFilter({ ...filter, info: !filter.info })}
              />
              <span className="ml-2 text-blue-600">Info</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-amber-600"
                checked={filter.warn}
                onChange={() => setFilter({ ...filter, warn: !filter.warn })}
              />
              <span className="ml-2 text-amber-600">Warning</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-red-600"
                checked={filter.error}
                onChange={() => setFilter({ ...filter, error: !filter.error })}
              />
              <span className="ml-2 text-red-600">Error</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-purple-600"
                checked={filter.debug}
                onChange={() => setFilter({ ...filter, debug: !filter.debug })}
              />
              <span className="ml-2 text-purple-600">Debug</span>
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search logs"
              className="border rounded px-3 py-1 w-40 md:w-64"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Clear
            </button>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5"
                checked={autoScroll}
                onChange={() => setAutoScroll(!autoScroll)}
              />
              <span className="ml-2">Auto-scroll</span>
            </label>
          </div>
        </div>
      </div>

      {/* Logs container */}
      <div
        ref={logContainerRef}
        className="bg-gray-900 text-gray-100 p-4 rounded h-[calc(100vh-300px)] overflow-y-auto font-mono text-sm"
        style={{ direction: 'rtl' }} // Reverse the scroll direction
      >
        <div style={{ direction: 'ltr' }}> {/* Restore text direction */}
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => (
              <div key={index} className="mb-2 border-b border-gray-800 pb-2">
                <div className="flex items-start">
                  <span className="text-gray-400 min-w-[180px]">{formatTimestamp(log.timestamp)}</span>
                  <span className={`px-2 ${getLogTypeStyle(log.type)}`}>[{log.type.toUpperCase()}]</span>
                  <div className="flex-1">
                    <div className="break-all">{log.message}</div>
                    {log.data && (
                      <pre className="text-xs bg-gray-800 p-2 rounded mt-1 overflow-auto max-h-40">
                        {typeof log.data === 'string' 
                          ? log.data 
                          : JSON.stringify(log.data, null, 2)
                        }
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-10">No logs to display</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveServerLogs;