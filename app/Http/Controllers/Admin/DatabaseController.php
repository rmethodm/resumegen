<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DatabaseController extends Controller
{
    public function index(): Response
    {
        $engineOk = config('database.default') === 'pgsql';
        $connection = config('database.connections.pgsql');

        $stats = ['size_bytes' => 0, 'version' => null, 'active_connections' => 0, 'uptime' => null];
        $tables = [];

        if ($engineOk) {
            $stats = [
                'size_bytes' => (int) DB::selectOne('select pg_database_size(current_database()) as size')->size,
                'version' => DB::selectOne('select version() as version')->version,
                'active_connections' => (int) DB::selectOne(
                    'select count(*) as count from pg_stat_activity where datname = current_database()'
                )->count,
                'uptime' => DB::selectOne(
                    "select date_trunc('second', now() - pg_postmaster_start_time()) as uptime"
                )->uptime,
            ];

            $tables = collect(DB::select(<<<'SQL'
                select
                    s.relname as table_name,
                    s.n_live_tup as row_estimate,
                    pg_total_relation_size(s.relid) as size_bytes
                from pg_stat_user_tables s
                where s.schemaname = 'public'
                order by pg_total_relation_size(s.relid) desc
            SQL))->map(fn ($t) => [
                'name' => $t->table_name,
                'row_estimate' => (int) $t->row_estimate,
                'size_bytes' => (int) $t->size_bytes,
            ])->all();
        }

        return Inertia::render('Admin/Database/Overview', [
            'engine_ok' => $engineOk,
            'connection' => [
                'host' => $connection['host'] ?? null,
                'port' => $connection['port'] ?? null,
                'database' => $connection['database'] ?? null,
            ],
            'stats' => $stats,
            'tables' => $tables,
        ]);
    }
}
