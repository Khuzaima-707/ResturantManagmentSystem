import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * Global Error Boundary
 * Catches any render errors in child components and displays a helpful recovery UI
 * instead of leaving the user with an inexplicable blank white screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Uncaught Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#ECEEF2] flex items-center justify-center p-4 select-none font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Kuch Ghalat Ho Gaya / Something went wrong
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              An unexpected error occurred while rendering this page. You can reload or return to Dashboard.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Error Details:
                </span>
                <code className="text-xs text-rose-600 font-mono break-all block">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5C28] hover:bg-[#E04D1D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
