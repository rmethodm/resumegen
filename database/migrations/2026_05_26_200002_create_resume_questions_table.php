<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('resume_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_share_link_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->string('sender_name');
            $table->string('sender_email');
            $table->string('sender_phone');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('resume_questions');
    }
};
