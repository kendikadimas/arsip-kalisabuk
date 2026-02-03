<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
        ]);

        try {
            // Initialize Google Client
            $client = new Client();
            $validation = config('filesystems.disks.google.service_account');
            if (!file_exists($validation)) {
                // Fallback or error if credential file missing
                // For now, proceed, but it will throw if file missing.
            }
            $client->setAuthConfig($validation);
            $client->addScope(Drive::DRIVE);
            $service = new Drive($client);

            // Parent Folder ID from config
            $parentId = config('filesystems.disks.google.folder_id');

            // Create Folder on Drive
            $fileMetadata = new DriveFile([
                'name' => $request->name,
                'mimeType' => 'application/vnd.google-apps.folder',
                'parents' => $parentId ? [$parentId] : []
            ]);

            $folder = $service->files->create($fileMetadata, [
                'fields' => 'id'
            ]);

            // Save to DB
            $category = Category::create([
                'name' => $request->name,
                'drive_folder_id' => $folder->id
            ]);

            return response()->json($category, 201);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Drive Error: ' . $e->getMessage()], 500);
        }
    }
}
