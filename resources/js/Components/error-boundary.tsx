import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
                    <p className="text-lg font-semibold text-gray-900">Something went wrong.</p>
                    <p className="text-sm text-gray-600">Reload the page to try again.</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-1"
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
