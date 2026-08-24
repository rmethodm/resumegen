import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import { Card } from '@/Components/ui/card';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

const COLUMN_TYPES = [
    'string',
    'text',
    'integer',
    'bigInteger',
    'boolean',
    'date',
    'dateTime',
    'decimal',
    'jsonb',
];

export default function Show({
    table,
    columns,
    primary_key,
    sort,
    dir,
    filters,
    rows,
}: {
    table: string;
    columns: string[];
    primary_key: string | null;
    sort: string;
    dir: 'asc' | 'desc';
    filters: Record<string, string>;
    rows: Paginator<Record<string, unknown>>;
}) {
    const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [addingColumn, setAddingColumn] = useState(false);
    const [dropTarget, setDropTarget] = useState<{ type: 'column' | 'index'; name: string } | null>(
        null,
    );
    const [truncating, setTruncating] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    function sortBy(column: string) {
        router.get(
            route('admin.database.tables.show', { table }),
            { sort: column, dir: sort === column && dir === 'asc' ? 'desc' : 'asc', filter: filters },
            { preserveState: true },
        );
    }

    function applyFilter(column: string, value: string) {
        router.get(
            route('admin.database.tables.show', { table }),
            { sort, dir, filter: { ...filters, [column]: value } },
            { preserveState: true },
        );
    }

    function openEdit(row: Record<string, unknown>) {
        setEditing(row);
        const values: Record<string, string> = {};
        columns.forEach((c) => {
            values[c] = row[c] === null || row[c] === undefined ? '' : String(row[c]);
        });
        setEditValues(values);
    }

    function submitEdit(e: FormEvent) {
        e.preventDefault();
        if (!editing || !primary_key) return;
        router.patch(
            route('admin.database.tables.rows.update', { table, id: String(editing[primary_key]) }),
            { values: editValues },
            { onSuccess: () => setEditing(null) },
        );
    }

    function deleteRow(row: Record<string, unknown>) {
        if (!primary_key) return;
        const id = String(row[primary_key]);
        if (!window.confirm(`Delete row ${primary_key}=${id}?`)) return;
        router.delete(route('admin.database.tables.rows.destroy', { table, id }));
    }

    function submitAddColumn(e: FormEvent) {
        const form = e.target as HTMLFormElement;
        e.preventDefault();
        const data = new FormData(form);
        router.post(
            route('admin.database.tables.columns.store', { table }),
            {
                name: data.get('name'),
                type: data.get('type'),
                nullable: data.get('nullable') === 'on',
            },
            { onSuccess: () => setAddingColumn(false) },
        );
    }

    function submitDrop(e: FormEvent) {
        e.preventDefault();
        if (!dropTarget) return;
        const routeName =
            dropTarget.type === 'column'
                ? 'admin.database.tables.columns.destroy'
                : 'admin.database.tables.indexes.destroy';
        const params =
            dropTarget.type === 'column'
                ? { table, column: dropTarget.name }
                : { table, index: dropTarget.name };
        router.delete(route(routeName, params), {
            data: { confirm: confirmText },
            onSuccess: () => {
                setDropTarget(null);
                setConfirmText('');
            },
        });
    }

    function submitTruncate(e: FormEvent) {
        e.preventDefault();
        router.post(
            route('admin.database.tables.truncate', { table }),
            { confirm: confirmText },
            {
                onSuccess: () => {
                    setTruncating(false);
                    setConfirmText('');
                },
            },
        );
    }

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <Link
                            href={route('admin.database.index')}
                            className="text-xs text-gray-500 hover:underline"
                        >
                            ← Database
                        </Link>
                        <h1 className="mt-0.5 font-mono text-xl font-bold text-gray-900">{table}</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setAddingColumn(true)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Add column
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmText('');
                                setTruncating(true);
                            }}
                            className="rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2 text-sm font-medium text-danger-text hover:bg-danger-subtle"
                        >
                            Truncate
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Admin · ${table}`} />

            <Card className="gap-0 overflow-x-auto py-0">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            {columns.map((c) => (
                                <th key={c} className="px-3 py-2">
                                    <button
                                        type="button"
                                        onClick={() => sortBy(c)}
                                        className="flex items-center gap-1 hover:text-gray-900"
                                    >
                                        {c}
                                        {sort === c ? (dir === 'asc' ? '▲' : '▼') : null}
                                    </button>
                                    <input
                                        type="text"
                                        defaultValue={filters[c] ?? ''}
                                        onBlur={(e) => applyFilter(c, e.target.value)}
                                        placeholder="filter…"
                                        className="mt-1 w-full rounded-sm border border-gray-200 px-1 py-0.5 text-[11px] font-normal normal-case"
                                    />
                                </th>
                            ))}
                            <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-gray-500">
                                    No rows match.
                                </td>
                            </tr>
                        ) : (
                            rows.data.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50/80">
                                    {columns.map((c) => (
                                        <td key={c} className="max-w-xs truncate px-3 py-2 font-mono text-xs text-gray-700">
                                            {row[c] === null ? (
                                                <span className="text-ink-faint">null</span>
                                            ) : (
                                                String(row[c])
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(row)}
                                                disabled={!primary_key}
                                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteRow(row)}
                                                disabled={!primary_key}
                                                className="rounded-md border border-danger/30 bg-danger-subtle px-2 py-1 text-xs font-medium text-danger-text hover:bg-danger-subtle disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {rows.links.length > 3 ? (
                <div className="mt-4 flex flex-wrap gap-1">
                    {rows.links.map((link, i) =>
                        link.url ? (
                            <Link
                                key={i}
                                href={link.url}
                                className={
                                    'rounded-sm border px-2 py-1 text-xs ' +
                                    (link.active
                                        ? 'border-gray-900 bg-gray-900 text-white'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ) : (
                            <span
                                key={i}
                                className="rounded-sm border border-transparent px-2 py-1 text-xs text-ink-faint"
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ),
                    )}
                </div>
            ) : null}

            <Modal show={editing !== null} onClose={() => setEditing(null)} maxWidth="lg" title="Edit row">
                <form onSubmit={submitEdit} className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
                    {columns
                        .filter((c) => c !== primary_key)
                        .map((c) => (
                            <div key={c}>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    {c}
                                </label>
                                <input
                                    type="text"
                                    value={editValues[c] ?? ''}
                                    onChange={(e) =>
                                        setEditValues((v) => ({ ...v, [c]: e.target.value }))
                                    }
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs focus:border-brand focus:outline-hidden focus:ring-1 focus:ring-brand"
                                />
                            </div>
                        ))}
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={addingColumn} onClose={() => setAddingColumn(false)} maxWidth="md" title="Add column">
                <form onSubmit={submitAddColumn} className="space-y-3 p-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Name
                        </label>
                        <input
                            name="name"
                            type="text"
                            required
                            pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Type
                        </label>
                        <select
                            name="type"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs"
                        >
                            {COLUMN_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input name="nullable" type="checkbox" defaultChecked />
                        Nullable
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setAddingColumn(false)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-accent"
                        >
                            Add
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                show={dropTarget !== null}
                onClose={() => setDropTarget(null)}
                maxWidth="md"
                title={`Drop ${dropTarget?.type}`}
            >
                <form onSubmit={submitDrop} className="space-y-3 p-5">
                    <p className="text-sm text-gray-600">
                        Type <code className="rounded-sm bg-gray-100 px-1 font-mono text-xs">{dropTarget?.name}</code>{' '}
                        exactly to confirm.
                    </p>
                    <input
                        type="text"
                        autoComplete="off"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                        placeholder={dropTarget?.name}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setDropTarget(null)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={confirmText !== dropTarget?.name}
                            className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Drop
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={truncating} onClose={() => setTruncating(false)} maxWidth="md" title="Truncate table">
                <form onSubmit={submitTruncate} className="space-y-3 p-5">
                    <p className="text-sm text-gray-600">
                        This deletes <strong>all rows</strong> in{' '}
                        <code className="rounded-sm bg-gray-100 px-1 font-mono text-xs">{table}</code>. Type
                        the table name exactly to confirm.
                    </p>
                    <input
                        type="text"
                        autoComplete="off"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-xs"
                        placeholder={table}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setTruncating(false)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={confirmText !== table}
                            className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Truncate
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
