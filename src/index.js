import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx'; // Changed from './App' to './App.jsx'
import reportWebVitals from './reportWebVitals';

// Error boundary for production error handling
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Application Error:', error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-6 text-center">
                        <h2 className="text-xl font-semibold text-red-200 mb-4">
                            Application Error
                        </h2>
                        <p className="text-red-300 mb-4">
                            Something went wrong. Please refresh the page or contact your system administrator.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors"
                        >
                            Reload Application
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                            <details className="mt-4 text-left text-sm">
                                <summary className="cursor-pointer text-red-200">Error Details</summary>
                                <pre className="mt-2 text-red-100 bg-red-800 p-2 rounded text-xs overflow-auto">
                                    {this.state.error && this.state.error.toString()}
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Hide loading spinner
const loadingElement = document.getElementById('loading');
if (loadingElement) {
    loadingElement.style.display = 'none';
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);

// Performance monitoring
reportWebVitals(console.log);