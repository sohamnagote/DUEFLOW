import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled React error:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-[#fbf9f4]">
          <div className="max-w-md w-full bg-[#ffffff] rounded-2xl border border-[#001126]/10 p-8 shadow-sm text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#001126]">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h3>
              <p className="text-xs text-[#44474d] mt-2 leading-relaxed">
                A display error occurred while rendering this view. Your saved invoices and client data remain secure.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="btn-action-primary w-full sm:w-auto px-5 py-2.5 text-xs rounded-xl cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Try again</span>
              </button>
              <button
                onClick={this.handleReload}
                className="btn-action-secondary w-full sm:w-auto px-5 py-2.5 text-xs rounded-xl cursor-pointer"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
