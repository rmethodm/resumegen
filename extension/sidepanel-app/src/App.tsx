import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useConnection } from '@/hooks/useConnection';
import { useResumes } from '@/hooks/useResumes';
import { sendMessage } from '@/lib/chrome-messaging';
import { Header } from '@/components/Header';
import { SetupView } from '@/components/SetupView';
import { LoadingView } from '@/components/LoadingView';
import { EmptyView } from '@/components/EmptyView';
import { ReadyView } from '@/components/ReadyView';

type View = 'setup' | 'loading' | 'empty' | 'ready' | 'help';

export function App() {
    const { status: connectionStatus, recheck } = useConnection();
    const resumes = useResumes();
    const [view, setView] = useState<View>('loading');
    const [previousView, setPreviousView] = useState<View>('ready');

    useEffect(() => {
        if (connectionStatus === 'checking') {
            return;
        }
        if (connectionStatus === 'disconnected') {
            setView('setup');
            return;
        }
        resumes.load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionStatus]);

    useEffect(() => {
        if (resumes.status === 'auth_error') {
            setView('setup');
        } else if (resumes.status === 'loading') {
            setView('loading');
        } else if (resumes.status === 'empty') {
            setView('empty');
        } else if (resumes.status === 'ready' || resumes.status === 'error') {
            setView((v) => (v === 'help' ? v : 'ready'));
        }
    }, [resumes.status]);

    function openHelp() {
        setPreviousView((prev) => (view === 'help' ? prev : view));
        setView('help');
    }

    function closeHelp() {
        setView(previousView);
    }

    async function disconnect() {
        if (!confirm('Disconnect this browser? You can connect again anytime.')) {
            return;
        }
        await sendMessage('DISCONNECT');
        await recheck();
    }

    return (
        <div className="flex h-full min-h-screen flex-col">
            <Header
                onRefresh={() => resumes.load()}
                onOpenApp={() => sendMessage('OPEN_APP', { path: '/dashboard' })}
                onOpenSettings={() => chrome.runtime.openOptionsPage()}
                onDisconnect={disconnect}
            />
            <main className="flex-1 overflow-y-auto p-4">
                {view === 'setup' && <SetupView />}
                {view === 'loading' && <LoadingView />}
                {view === 'empty' && <EmptyView email={resumes.user?.email} onRefresh={() => resumes.load()} />}
                {view === 'ready' && <ReadyView resumes={resumes} />}
                {view === 'help' && <div data-testid="help-view-stub">help</div>}
            </main>
            <footer className="flex items-center justify-between border-t p-2 text-sm">
                <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => sendMessage('OPEN_APP', { path: '/dashboard' })}
                >
                    Open Resumegen
                </button>
                <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={openHelp}>
                    Help
                </button>
            </footer>
            <Toaster position="bottom-center" />
        </div>
    );
}
