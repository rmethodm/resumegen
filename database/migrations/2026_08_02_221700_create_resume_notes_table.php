<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-version canvas sticky notes — private tailoring reminders the owner drops
 * on the workstation canvas. Deliberately its own table, not part of the resume
 * document: ResumeDocument::save() deletes every child row on each autosave, so
 * a note stored there would vanish on the next keystroke.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resume_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            // ponytail: absolute px offsets in the canvas scroll container, not
            // fractions of it — a far-right note can slip off-screen if the rail
            // collapses below xl. Store fractional coords vs scroll size if it bites.
            $table->integer('x');
            $table->integer('y');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_notes');
    }
};
