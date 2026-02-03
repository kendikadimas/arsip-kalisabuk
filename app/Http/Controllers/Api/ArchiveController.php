<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Archive;
use App\Models\Category;
use Illuminate\Http\Request;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;

class ArchiveController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'title' => 'required|string|max:255',
            'year' => 'required|integer|digits:4',
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        try {
            $category = Category::findOrFail($request->category_id);

            if (!class_exists('\Google\Client')) {
                throw new \Exception('Google API Client not found. Please run composer install.');
            }

            // Init Google Client
            $client = new \Google\Client();

            // Fix for local development SSL issues (cURL error 60)
            // MUST be done before calling refreshToken or any API calls
            if (app()->environment('local')) {
                $httpClient = new \GuzzleHttp\Client(['verify' => false]);
                $client->setHttpClient($httpClient);
            }

            if (config('filesystems.disks.google.refresh_token')) {
                $client->setClientId(config('filesystems.disks.google.client_id'));
                $client->setClientSecret(config('filesystems.disks.google.client_secret'));
                $client->refreshToken(config('filesystems.disks.google.refresh_token'));
            } else {
                $client->setAuthConfig(config('filesystems.disks.google.service_account'));
            }

            $client->addScope(\Google\Service\Drive::DRIVE);
            $service = new \Google\Service\Drive($client);

            // Ensure category has a drive folder
            if (!$category->drive_folder_id) {
                $folderMetadata = new \Google\Service\Drive\DriveFile([
                    'name' => $category->name,
                    'mimeType' => 'application/vnd.google-apps.folder',
                    'parents' => [config('filesystems.disks.google.folder_id')]
                ]);
                $folder = $service->files->create($folderMetadata, ['fields' => 'id']);
                $category->update(['drive_folder_id' => $folder->id]);
            }

            // file content
            $content = file_get_contents($request->file('file')->getRealPath());

            // Upload to Drive
            $fileMetadata = new \Google\Service\Drive\DriveFile([
                'name' => $request->title . '.pdf',
                'parents' => [$category->drive_folder_id]
            ]);

            $file = $service->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => 'application/pdf',
                'uploadType' => 'multipart',
                'fields' => 'id, webViewLink'
            ]);

            // Save DB
            $archive = Archive::create([
                'category_id' => $category->id,
                'title' => $request->title,
                'year' => $request->year,
                'drive_file_id' => $file->id,
                'view_link' => $file->webViewLink
            ]);

            return response()->json($archive, 201);

        } catch (\Exception $e) {
            \Log::error('Drive Upload Error: ' . $e->getMessage());
            return response()->json(['error' => 'Upload Error: ' . $e->getMessage()], 500);
        }
    }
}
