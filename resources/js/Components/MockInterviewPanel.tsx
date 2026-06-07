import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Props {
    resumeId: number;
    onClose: () => void;
}

export default function MockInterviewPanel({ resumeId, onClose }: Props) {
    const [targetRole, setTargetRole] = useState('');
    const [started, setStarted] = useState(false);
    const [history, setHistory] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const sendMessage = async (userMessage?: string) => {
        setLoading(true);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? '';
            const payload: Record<string, unknown> = {
                target_role: targetRole,
                history,
                _token: csrfToken,
            };
            if (userMessage) {
                payload.user_message = userMessage;
            }
            const res = await axios.post(route('builder.mock-interview', resumeId), payload);
            const assistantMsg: Message = { role: 'assistant', content: res.data.message };
            setHistory((h) =>
                userMessage
                    ? [...h, { role: 'user', content: userMessage }, assistantMsg]
                    : [...h, assistantMsg],
            );
            if (res.data.done) {
                setDone(true);
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        if (!targetRole.trim()) return;
        setStarted(true);
        await sendMessage();
    };

    const handleSend = async () => {
        if (!userInput.trim() || loading || done) return;
        const msg = userInput.trim();
        setUserInput('');
        await sendMessage(msg);
    };

    const handleReset = () => {
        setStarted(false);
        setHistory([]);
        setUserInput('');
        setDone(false);
        setTargetRole('');
    };

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl z-40 flex flex-col border-l border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">🎤 Mock Interview</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                >
                    ✕
                </button>
            </div>

            {!started ? (
                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Practice answering interview questions for your target role. Claude will ask one question at a time and give feedback on your answers.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Target Role
                        </label>
                        <input
                            type="text"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                            placeholder="e.g. Senior Software Engineer"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={!targetRole.trim() || loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Starting…' : 'Start Interview'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {history.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                                        msg.role === 'user'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                    }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                    Thinking…
                                </div>
                            </div>
                        )}
                        {done && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-200 text-center font-medium">
                                Interview complete! 🎉
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        {!done ? (
                            <div className="flex gap-2">
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
                                    rows={2}
                                    disabled={loading}
                                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!userInput.trim() || loading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleReset}
                                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                New Interview
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
