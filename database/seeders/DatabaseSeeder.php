<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $categories = ['Kartu Keluarga', 'Akta Kelahiran', 'Surat Tanah', 'Surat Pindah', 'KTP'];

        foreach ($categories as $catName) {
            $category = \App\Models\Category::create(['name' => $catName]);

            // Create 1-5 random archives for each category
            for ($i = 0; $i < rand(1, 5); $i++) {
                \App\Models\Archive::create([
                    'category_id' => $category->id,
                    'title' => $catName . ' - File ' . ($i + 1),
                    'year' => rand(2020, 2025),
                    'drive_file_id' => 'mock_id_' . rand(1000, 9999),
                    'view_link' => '#',
                ]);
            }
        }
    }
}
