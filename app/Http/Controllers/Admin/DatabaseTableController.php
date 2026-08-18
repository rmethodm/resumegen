<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class DatabaseTableController extends Controller
{
    public function show(Request $request, string $table): Response
    {
        $this->assertTableExists($table);

        $columns = Schema::getColumnListing($table);
        $primaryKey = $this->primaryKeyColumn($table);

        $sort = $request->string('sort')->toString();
        $sort = in_array($sort, $columns, true) ? $sort : ($primaryKey ?? $columns[0]);
        $dir = $request->string('dir')->toString() === 'desc' ? 'desc' : 'asc';

        $query = DB::table($table);

        foreach ($request->query('filter', []) as $column => $value) {
            if (in_array($column, $columns, true) && $value !== '') {
                $query->where($column, 'like', '%'.$value.'%');
            }
        }

        $rows = $query->orderBy($sort, $dir)->paginate(25)->withQueryString();

        return Inertia::render('Admin/Database/Table/Show', [
            'table' => $table,
            'columns' => $columns,
            'primary_key' => $primaryKey,
            'sort' => $sort,
            'dir' => $dir,
            'filters' => $request->query('filter', []),
            'rows' => $rows,
        ]);
    }

    public function updateRow(Request $request, string $table, string $id): RedirectResponse
    {
        $this->assertTableExists($table);
        $primaryKey = $this->requirePrimaryKeyColumn($table);
        $columns = Schema::getColumnListing($table);

        $values = collect($request->input('values', []))
            ->only($columns)
            ->except($primaryKey)
            ->all();

        $before = DB::table($table)->where($primaryKey, $id)->first();
        abort_unless($before !== null, 404);

        DB::table($table)->where($primaryKey, $id)->update($values);

        $this->record($request, 'database.table.row_updated', [
            'table' => $table,
            'row_id' => $id,
            'columns_changed' => array_keys($values),
        ]);

        return back()->with('success', 'Row updated.');
    }

    public function destroyRow(Request $request, string $table, string $id): RedirectResponse
    {
        $this->assertTableExists($table);
        $primaryKey = $this->requirePrimaryKeyColumn($table);

        $deleted = DB::table($table)->where($primaryKey, $id)->delete();
        abort_unless($deleted > 0, 404);

        $this->record($request, 'database.table.row_deleted', [
            'table' => $table,
            'row_id' => $id,
        ]);

        return back()->with('success', 'Row deleted.');
    }

    public function addColumn(Request $request, string $table): RedirectResponse
    {
        $this->assertTableExists($table);

        $validated = $request->validate([
            'name' => ['required', 'string', 'regex:/^[a-zA-Z_][a-zA-Z0-9_]*$/'],
            'type' => ['required', 'string', 'in:string,text,integer,bigInteger,boolean,date,dateTime,decimal,jsonb'],
            'nullable' => ['boolean'],
        ]);

        Schema::table($table, function (Blueprint $blueprint) use ($validated) {
            $column = $blueprint->{$validated['type']}($validated['name']);

            if ($validated['nullable'] ?? true) {
                $column->nullable();
            }
        });

        $this->record($request, 'database.table.column_added', [
            'table' => $table,
            'column' => $validated['name'],
            'type' => $validated['type'],
        ]);

        return back()->with('success', 'Column added: '.$validated['name']);
    }

    public function dropColumn(Request $request, string $table, string $column): RedirectResponse
    {
        $this->assertTableExists($table);
        $this->assertValidIdentifier($column);

        abort_unless(
            $request->string('confirm')->toString() === $column,
            422,
            'Type the exact column name to confirm.'
        );

        Schema::table($table, function (Blueprint $blueprint) use ($column) {
            $blueprint->dropColumn($column);
        });

        $this->record($request, 'database.table.column_dropped', [
            'table' => $table,
            'column' => $column,
        ]);

        return back()->with('success', 'Column dropped: '.$column);
    }

    public function addIndex(Request $request, string $table): RedirectResponse
    {
        $this->assertTableExists($table);

        $validated = $request->validate([
            'columns' => ['required', 'array', 'min:1'],
            'columns.*' => ['string', 'regex:/^[a-zA-Z_][a-zA-Z0-9_]*$/'],
            'unique' => ['boolean'],
        ]);

        Schema::table($table, function (Blueprint $blueprint) use ($validated) {
            if ($validated['unique'] ?? false) {
                $blueprint->unique($validated['columns']);
            } else {
                $blueprint->index($validated['columns']);
            }
        });

        $this->record($request, 'database.table.index_added', [
            'table' => $table,
            'columns' => $validated['columns'],
        ]);

        return back()->with('success', 'Index added on: '.implode(', ', $validated['columns']));
    }

    public function dropIndex(Request $request, string $table, string $index): RedirectResponse
    {
        $this->assertTableExists($table);
        $this->assertValidIdentifier($index);

        abort_unless(
            $request->string('confirm')->toString() === $index,
            422,
            'Type the exact index name to confirm.'
        );

        Schema::table($table, function (Blueprint $blueprint) use ($index) {
            $blueprint->dropIndex($index);
        });

        $this->record($request, 'database.table.index_dropped', [
            'table' => $table,
            'index' => $index,
        ]);

        return back()->with('success', 'Index dropped: '.$index);
    }

    public function truncate(Request $request, string $table): RedirectResponse
    {
        $this->assertTableExists($table);

        abort_unless(
            $request->string('confirm')->toString() === $table,
            422,
            'Type the exact table name to confirm.'
        );

        $rowCountBefore = (int) DB::table($table)->count();

        DB::table($table)->truncate();

        $this->record($request, 'database.table.truncated', [
            'table' => $table,
            'rows_before' => $rowCountBefore,
        ]);

        return back()->with('success', 'Table truncated: '.$table);
    }

    private function assertTableExists(string $table): void
    {
        $this->assertValidIdentifier($table);

        abort_unless(Schema::hasTable($table), 404);
    }

    private function assertValidIdentifier(string $identifier): void
    {
        abort_unless(preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $identifier) === 1, 422);
    }

    private function primaryKeyColumn(string $table): ?string
    {
        if (config('database.default') !== 'pgsql') {
            // SQLite (test env) has no equivalent catalog query wired up here —
            // fall back to Laravel's own convention instead of erroring.
            return in_array('id', Schema::getColumnListing($table), true) ? 'id' : null;
        }

        $row = DB::selectOne(<<<'SQL'
            select a.attname as column_name
            from pg_index i
            join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
            where i.indrelid = ?::regclass and i.indisprimary and cardinality(i.indkey) = 1
        SQL, [$table]);

        return $row?->column_name;
    }

    private function requirePrimaryKeyColumn(string $table): string
    {
        $primaryKey = $this->primaryKeyColumn($table);

        if ($primaryKey === null) {
            throw new RuntimeException("Table \"{$table}\" has no single-column primary key; row edit/delete is not supported.");
        }

        return $primaryKey;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function record(Request $request, string $action, array $meta): void
    {
        $actor = $request->user();
        if ($actor === null) {
            return;
        }

        AdminActionLog::record($actor, null, $action, $meta);
    }
}
