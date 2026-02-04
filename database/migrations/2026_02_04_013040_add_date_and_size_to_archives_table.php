<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('archives', function (Blueprint $table) {
            $table->timestamp('uploaded_at')->nullable()->useCurrent()->after('year'); // Date of upload (explicit)
            $table->unsignedBigInteger('file_size')->default(0)->after('view_link'); // Size in bytes
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('archives', function (Blueprint $table) {
            $table->dropColumn(['uploaded_at', 'file_size']);
        });
    }
};
