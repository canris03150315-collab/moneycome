import React from 'react';

interface ErrorBoundaryState { hasError: boolean; error?: Error; }

type ErrorBoundaryProps = { children?: React.ReactNode };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Could log to an error reporting service
    console.error('UI ErrorBoundary caught error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-lg w-full bg-white border shadow rounded-xl p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">出了點問題</h1>
            <p className="text-gray-600 mb-5">頁面發生未預期的錯誤，您可以嘗試重新載入或回到首頁。</p>
            <div className="flex items-center justify-center gap-3">
              <button className="px-4 py-2 rounded bg-black text-white" onClick={this.handleReload}>重新載入</button>
              <a className="px-4 py-2 rounded bg-amber-500 text-white" href="/">回首頁</a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
