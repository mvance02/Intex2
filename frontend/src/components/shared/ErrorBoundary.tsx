import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    // In IS 414/production: send to error reporting service
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white shadow-sm border border-gray-100 p-8 text-center">
            <span className="text-5xl mb-4 block" aria-hidden="true">⚠️</span>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-6">{this.state.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2 text-sm bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
              <Link
                to="/"
                onClick={this.handleReset}
                className="px-5 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
