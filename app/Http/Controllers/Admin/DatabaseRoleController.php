<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DatabaseRoleController extends Controller
{
    private const PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];

    public function index(): Response
    {
        $engineOk = config('database.default') === 'pgsql';
        $roles = [];
        $grants = [];

        if ($engineOk) {
            $roles = DB::select(<<<'SQL'
                select rolname, rolsuper, rolcanlogin
                from pg_roles
                where rolname not like 'pg\_%'
                order by rolname
            SQL);

            $grants = DB::select(<<<'SQL'
                select grantee, table_schema, table_name, privilege_type
                from information_schema.role_table_grants
                where table_schema = 'public'
                order by grantee, table_name, privilege_type
            SQL);
        }

        return Inertia::render('Admin/Database/Roles/Index', [
            'engine_ok' => $engineOk,
            'roles' => $roles,
            'grants' => $grants,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(config('database.default') === 'pgsql', 422, 'Roles require PostgreSQL.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'regex:/^[a-zA-Z_][a-zA-Z0-9_]*$/'],
            'can_login' => ['boolean'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $sql = 'create role "'.$validated['name'].'"';
        $sql .= ($validated['can_login'] ?? false) ? ' login' : ' nologin';

        if (! empty($validated['password'])) {
            DB::statement($sql.' password ?', [$validated['password']]);
        } else {
            DB::statement($sql);
        }

        $this->record($request, 'database.role.created', [
            'role' => $validated['name'],
            'can_login' => $validated['can_login'] ?? false,
        ]);

        return back()->with('success', 'Role created: '.$validated['name']);
    }

    public function grant(Request $request, string $role): RedirectResponse
    {
        abort_unless(config('database.default') === 'pgsql', 422, 'Roles require PostgreSQL.');
        $this->assertValidIdentifier($role);

        $validated = $request->validate([
            'table' => ['required', 'string', 'regex:/^[a-zA-Z_][a-zA-Z0-9_]*$/'],
            'privilege' => ['required', 'string', 'in:'.implode(',', self::PRIVILEGES)],
            'confirm' => ['required', 'string'],
        ]);

        abort_unless($validated['confirm'] === $role, 422, 'Type the exact role name to confirm.');

        DB::statement(sprintf(
            'grant %s on "%s" to "%s"',
            $validated['privilege'],
            $validated['table'],
            $role
        ));

        $this->record($request, 'database.role.granted', [
            'role' => $role,
            'table' => $validated['table'],
            'privilege' => $validated['privilege'],
        ]);

        return back()->with('success', "Granted {$validated['privilege']} on {$validated['table']} to {$role}");
    }

    public function revoke(Request $request, string $role): RedirectResponse
    {
        abort_unless(config('database.default') === 'pgsql', 422, 'Roles require PostgreSQL.');
        $this->assertValidIdentifier($role);

        $validated = $request->validate([
            'table' => ['required', 'string', 'regex:/^[a-zA-Z_][a-zA-Z0-9_]*$/'],
            'privilege' => ['required', 'string', 'in:'.implode(',', self::PRIVILEGES)],
            'confirm' => ['required', 'string'],
        ]);

        abort_unless($validated['confirm'] === $role, 422, 'Type the exact role name to confirm.');

        DB::statement(sprintf(
            'revoke %s on "%s" from "%s"',
            $validated['privilege'],
            $validated['table'],
            $role
        ));

        $this->record($request, 'database.role.revoked', [
            'role' => $role,
            'table' => $validated['table'],
            'privilege' => $validated['privilege'],
        ]);

        return back()->with('success', "Revoked {$validated['privilege']} on {$validated['table']} from {$role}");
    }

    public function destroy(Request $request, string $role): RedirectResponse
    {
        abort_unless(config('database.default') === 'pgsql', 422, 'Roles require PostgreSQL.');
        $this->assertValidIdentifier($role);

        abort_unless(
            $request->string('confirm')->toString() === $role,
            422,
            'Type the exact role name to confirm.'
        );

        DB::statement('drop role "'.$role.'"');

        $this->record($request, 'database.role.dropped', ['role' => $role]);

        return back()->with('success', 'Role dropped: '.$role);
    }

    private function assertValidIdentifier(string $identifier): void
    {
        abort_unless(preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $identifier) === 1, 422);
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
