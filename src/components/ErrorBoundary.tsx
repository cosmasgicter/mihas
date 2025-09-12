import React from 'react';

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    // In production, limit stack trace exposure
    const isDevelopment = import.meta.env.DEV
    return isDevelopment 
      ? error.message + '\n' + (error.stack || '')
      : error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return '[Unable to serialize error object]';
  }
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 rounded">
          <h2 className="text-red-500">Something went wrong.</h2>
          <pre className="mt-2 text-sm">{serializeError(this.state.error)}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}