import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 m-4 h-full">
                    <h2 className="text-xl font-bold mb-2">🚨 Something went wrong</h2>
                    <p className="text-sm mb-4">An unexpected error occurred in this component.</p>
                    <details className="text-xs text-left bg-black/20 p-4 rounded w-full overflow-auto max-h-48">
                        <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                        <pre className="whitespace-pre-wrap">{this.state.error && this.state.error.toString()}</pre>
                        <pre className="whitespace-pre-wrap mt-2 opacity-70">{this.state.errorInfo?.componentStack}</pre>
                    </details>
                    <button 
                        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
