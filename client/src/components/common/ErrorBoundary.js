import React from 'react';
import PropTypes from 'prop-types';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * @component ErrorBoundary
 * @description Comprehensive error boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI instead of crashing the entire app.
 *
 * Features:
 * - Different fallback UIs based on error type and context
 * - Error logging and reporting
 * - Recovery mechanisms (retry, reload, navigation)
 * - Development vs production mode handling
 * - User-friendly error messages
 * - Error details for debugging (dev mode)
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isRetrying: false,
      retryCount: 0,
      isReporting: false,
      hasReported: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Log to external service in production
    this.logErrorToService(error, errorInfo);
  }

  /**
   * Log error to external monitoring service
   */
  logErrorToService = async (error, errorInfo) => {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.name || 'Unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.props.userId,
        context: this.props.context,
      };

      // In a real app, you'd send this to your error monitoring service
      // Example: Sentry, LogRocket, Bugsnag, etc.
      if (process.env.NODE_ENV === 'production') {
        // await errorReportingService.report(errorData);
        console.error('Error logged:', errorData);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  /**
   * Attempt to recover from the error
   */
  handleRetry = () => {
    this.setState((prevState) => ({
      isRetrying: true,
      retryCount: prevState.retryCount + 1,
    }));

    // Reset error state after a brief delay
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
      });
    }, 1000);
  };

  /**
   * Navigate to home page
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Reload the page
   */
  handleReload = () => {
    window.location.reload();
  };

  /**
   * Copy error details to clipboard
   */
  handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;
    const errorText = `
Error ID: ${errorId}
Message: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      // Show success feedback
      this.setState({ hasReported: true });
      setTimeout(() => this.setState({ hasReported: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  /**
   * Report error to support
   */
  handleReportError = async () => {
    this.setState({ isReporting: true });

    try {
      // Simulate reporting to support system
      await new Promise((resolve) => setTimeout(resolve, 1500));
      this.setState({ hasReported: true, isReporting: false });
      setTimeout(() => this.setState({ hasReported: false }), 3000);
    } catch (err) {
      console.error('Failed to report error:', err);
      this.setState({ isReporting: false });
    }
  };

  /**
   * Render different error UIs based on props
   */
  renderErrorUI() {
    const {
      error,
      errorInfo,
      errorId,
      isRetrying,
      retryCount,
      isReporting,
      hasReported,
    } = this.state;
    const {
      level = 'component',
      showDetails = process.env.NODE_ENV === 'development',
    } = this.props;

    // Determine error severity and appropriate response
    const isChunkLoadError = error?.message?.includes('Loading chunk');
    const isNetworkError =
      error?.message?.includes('fetch') || error?.message?.includes('network');
    const isCriticalError = level === 'application' || retryCount >= 3;

    if (isRetrying) {
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-blue-700 font-medium">Recovering...</p>
            <p className="text-blue-600 text-sm">Please wait a moment</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'bg-white border rounded-lg shadow-sm',
          level === 'application'
            ? 'min-h-screen flex items-center justify-center'
            : 'min-h-[300px] flex items-center justify-center',
          isCriticalError ? 'border-red-300' : 'border-orange-300'
        )}
      >
        <div className="max-w-lg mx-auto text-center p-6">
          {/* Error Icon */}
          <div
            className={cn(
              'mx-auto mb-4 rounded-full p-3',
              isCriticalError ? 'bg-red-100' : 'bg-orange-100'
            )}
          >
            <AlertTriangle
              className={cn(
                'h-12 w-12',
                isCriticalError ? 'text-red-600' : 'text-orange-600'
              )}
            />
          </div>

          {/* Error Message */}
          <h3
            className={cn(
              'text-xl font-semibold mb-2',
              isCriticalError ? 'text-red-900' : 'text-orange-900'
            )}
          >
            {isCriticalError ? 'Application Error' : 'Something went wrong'}
          </h3>

          <p className="text-gray-600 mb-6">
            {isChunkLoadError &&
              'Failed to load application resources. This might be due to a recent update.'}
            {isNetworkError &&
              'Network connection issue. Please check your internet connection.'}
            {!isChunkLoadError &&
              !isNetworkError &&
              (isCriticalError
                ? 'A critical error occurred that prevented the application from working properly.'
                : 'An unexpected error occurred in this component. Other parts of the application should still work.')}
          </p>

          {/* Error ID for reference */}
          {errorId && (
            <div className="mb-6 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Error ID:{' '}
                <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">
                  {errorId}
                </code>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Actions */}
            <div className="flex gap-3 justify-center">
              {!isCriticalError && retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              )}

              {(isChunkLoadError || isCriticalError) && (
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>
              )}

              {level === 'application' && (
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleCopyError}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                {hasReported ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy Error
                  </>
                )}
              </button>

              <button
                onClick={this.handleReportError}
                disabled={isReporting}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isReporting ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Reporting...
                  </>
                ) : hasReported ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Reported
                  </>
                ) : (
                  <>
                    <Bug className="h-3 w-3" />
                    Report Issue
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Details (Development Mode) */}
          {showDetails && error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Technical Details
              </summary>
              <div className="mt-3 p-4 bg-gray-100 rounded-md overflow-auto">
                <div className="mb-3">
                  <h4 className="font-medium text-sm text-gray-900 mb-1">
                    Error Message:
                  </h4>
                  <code className="text-xs text-red-600 break-all">
                    {error.message}
                  </code>
                </div>

                {error.stack && (
                  <div className="mb-3">
                    <h4 className="font-medium text-sm text-gray-900 mb-1">
                      Stack Trace:
                    </h4>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-1">
                      Component Stack:
                    </h4>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Retry Count Warning */}
          {retryCount > 0 && retryCount < 3 && (
            <p className="mt-4 text-xs text-gray-500">
              Retry attempt {retryCount}/3
            </p>
          )}

          {retryCount >= 3 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-md">
              <p className="text-sm text-orange-800">
                Multiple retry attempts failed. Please refresh the page or
                contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  name: PropTypes.string, // Error boundary name for logging
  level: PropTypes.oneOf(['component', 'page', 'application']), // Error severity level
  fallback: PropTypes.elementType, // Custom fallback component
  showDetails: PropTypes.bool, // Show technical details
  onError: PropTypes.func, // Custom error handler
  userId: PropTypes.string, // User ID for error reporting
  context: PropTypes.object, // Additional context for error reporting
};

ErrorBoundary.defaultProps = {
  level: 'component',
  showDetails: process.env.NODE_ENV === 'development',
};

/**
 * Higher-order component for wrapping components with error boundaries
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
};

/**
 * Hook for error reporting within components
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error, errorInfo = {}) => {
    console.error('Manual error report:', error, errorInfo);

    // You could trigger error boundary or report directly to service
    if (error instanceof Error) {
      throw error; // Re-throw to trigger error boundary
    } else {
      throw new Error(
        typeof error === 'string' ? error : 'Unknown error occurred'
      );
    }
  }, []);

  return handleError;
};

export default ErrorBoundary;
