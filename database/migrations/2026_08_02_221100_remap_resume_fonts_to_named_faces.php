<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The font column stored typeface *classes* — `sans`, `serif`, `mono`. It now
 * stores named faces, so the old values validate as unknown and would fail the
 * next save of any existing resume.
 */
return new class extends Migration
{
    /** @var array<string, string> */
    private const REPLACEMENTS = [
        'sans' => 'arial',
        'serif' => 'georgia',
        // No monospace face survives in the new list; Arial is the closest
        // thing to a neutral default for the one resume that used it.
        'mono' => 'arial',
    ];

    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->string('font')->default('inter')->change();
        });

        foreach (self::REPLACEMENTS as $old => $new) {
            DB::table('resumes')->where('font', $old)->update(['font' => $new]);
        }
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->string('font')->default('sans')->change();
        });

        // `mono` and `sans` both map to `arial`, so the original value cannot
        // be recovered — everything that is now Arial reverts to `sans`.
        foreach (array_unique(self::REPLACEMENTS) as $old => $new) {
            DB::table('resumes')->where('font', $new)->update(['font' => $old]);
        }
    }
};
