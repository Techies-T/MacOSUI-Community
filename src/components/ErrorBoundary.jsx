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

    handleCopyError = () => {
        const errorText = `Error: ${this.state.error?.toString()}\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
        navigator.clipboard.writeText(errorText).then(() => {
            alert('エラー詳細をクリップボードにコピーしました。サポートや開発チームへお渡しください。');
        }).catch(err => {
            console.error('Failed to copy error:', err);
            alert('コピーに失敗しました。詳細領域を展開して手動でコピーしてください。');
        });
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 m-4 h-full max-h-[90%] overflow-y-auto">
                    <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                        <span>🚨</span> Something went wrong
                    </h2>
                    <p className="text-xs mb-4 text-center text-red-400/90">
                        このコンポーネントの処理中に予期しないエラーが発生しました。
                    </p>
                    
                    <details className="text-xs text-left bg-black/60 p-4 rounded w-full overflow-auto max-h-48 border border-red-500/20">
                        <summary className="cursor-pointer font-medium mb-2 outline-none select-none text-red-400">
                            ▶ Error Details (エラー詳細)
                        </summary>
                        <pre className="whitespace-pre-wrap font-mono text-[10px] text-red-300">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <pre className="whitespace-pre-wrap mt-2 opacity-70 font-mono text-[9px] text-gray-400">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </details>
                    
                    <div className="flex items-center gap-3 mt-4">
                        <button 
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold transition-colors text-xs cursor-pointer shadow-sm"
                            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        >
                            🔄 再読み込み
                        </button>
                        <button 
                            className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded hover:bg-gray-800 font-semibold transition-colors text-xs cursor-pointer shadow-sm"
                            onClick={this.handleCopyError}
                        >
                            📋 エラーをコピー
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
