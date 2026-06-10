import { TagIcon } from '@heroicons/react/24/outline';
import { router, useForm } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import { ShareLink } from '@/types';

function fallbackCopy(text: string) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

interface Props {
    resumeId: number;
    shareLinks: ShareLink[];
}

export default function SharePopover({ resumeId, shareLinks }: Props) {
    const linkForm = useForm({ label: '' });
    const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
    const [editingLinkLabel, setEditingLinkLabel] = useState('');
    const expiryInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    const saveLabel = useCallback((linkId: number) => {
        router.patch(
            route('share.update', [resumeId, linkId]),
            { label: editingLinkLabel } as any,
            { preserveScroll: true, preserveState: true, onSuccess: () => setEditingLinkId(null) }
        );
    }, [resumeId, editingLinkLabel]);

    return (
        <div className="p-4 flex flex-col gap-3">
            {shareLinks.length === 0 && (
                <p className="text-xs text-gray-400">No share links yet. Create one below.</p>
            )}
            {shareLinks.map(link => (
                <div key={link.id} className="flex flex-col gap-1.5 rounded-md border border-gray-200 bg-white p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-medium ${link.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                {link.is_active ? 'Active' : 'Revoked'}
                            </span>
                            <span className="text-gray-500 truncate">/r/{link.token.slice(0, 12)}…</span>
                            {editingLinkId === link.id ? (
                                <div className="flex items-center gap-1 min-w-0">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editingLinkLabel}
                                        onChange={e => setEditingLinkLabel(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveLabel(link.id);
                                            if (e.key === 'Escape') setEditingLinkId(null);
                                        }}
                                        className="rounded border-gray-300 text-xs py-0.5 px-1.5 w-32 focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => saveLabel(link.id)}
                                        className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700"
                                    >Save</button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingLinkId(null)}
                                        className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
                                    >✕</button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    {link.label && <span className="text-gray-400 truncate">— {link.label}</span>}
                                    <button
                                        type="button"
                                        title="Edit label"
                                        onClick={() => { setEditingLinkId(link.id); setEditingLinkLabel(link.label ?? ''); }}
                                        className="text-gray-300 hover:text-gray-500"
                                    >
                                        <TagIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    const url = `${window.location.origin}/r/${link.token}`;
                                    if (navigator.clipboard) {
                                        navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
                                    } else {
                                        fallbackCopy(url);
                                    }
                                }}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                            >Copy</button>
                            {link.is_active && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const expiryInput = expiryInputRefs.current[link.id];
                                        const expiresAt = expiryInput ? (expiryInput.value || null) : link.expires_at;
                                        router.patch(route('share.update', [resumeId, link.id]), { label: link.label, is_active: false, expires_at: expiresAt } as any);
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700"
                                >Revoke</button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-400 shrink-0">Expires</label>
                        <input
                            type="date"
                            title="Expiry date"
                            ref={el => { expiryInputRefs.current[link.id] = el; }}
                            defaultValue={link.expires_at ? link.expires_at.split('T')[0] : ''}
                            onBlur={e => router.patch(
                                route('share.update', [resumeId, link.id]),
                                { label: link.label, is_active: link.is_active, expires_at: e.target.value || null } as any,
                                { preserveScroll: true }
                            )}
                            className="rounded border-gray-200 text-[10px] py-0.5 px-1.5 text-gray-600 focus:border-indigo-400 focus:ring-indigo-400"
                        />
                        {link.expires_at && (
                            <span className="text-[10px] text-amber-600">
                                Expires {new Date(link.expires_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            ))}

            <form
                onSubmit={e => {
                    e.preventDefault();
                    linkForm.post(route('share.store', resumeId), { onSuccess: () => linkForm.reset() });
                }}
                className="flex gap-2 mt-1"
            >
                <input
                    type="text"
                    value={linkForm.data.label}
                    onChange={e => linkForm.setData('label', e.target.value)}
                    placeholder="Label (optional, e.g. Sent to Google)"
                    className="flex-1 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                    type="submit"
                    disabled={linkForm.processing}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                    Create Link
                </button>
            </form>
        </div>
    );
}
