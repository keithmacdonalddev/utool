import React from 'react';

/**
 * ErrorBoundary Component
 *
 * A generic React error boundary component to catch JavaScript errors
 * in its child component tree, log those errors, and display a fallback UI.
 *
 * @component
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * This lifecycle method is invoked after an error has been thrown by a descendant component.
   * It receives the error that was thrown as a parameter and should return a value to update state.
   * @param {Error} error - The error that was thrown.
   * @returns {object} An object to update state.
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  /**
   * This lifecycle method is invoked after an error has been thrown by a descendant component.
   * It receives two parameters:
   * 1. error - The error that was thrown.
   * 2. errorInfo - An object with a componentStack key containing information about which component threw the error.
   * @param {Error} error - The error that was thrown.
   * @param {React.ErrorInfo} errorInfo - Information about the component stack.
   */
  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Log to a more persistent logging solution or analytics in a real app
    // For example: logErrorToMyService(error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#1E293B',
            color: 'white',
            minHeight: '100vh',
          }}
        >
          <h1>Something went wrong.</h1>
          <p>
            We're sorry for the inconvenience. Please try refreshing the page,
            or contact support if the problem persists.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details
              style={{
                marginTop: '20px',
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                backgroundColor: '#2C3E50',
                padding: '10px',
                borderRadius: '5px',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development Mode)
              </summary>
              <p>{this.state.error && this.state.error.toString()}</p>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
