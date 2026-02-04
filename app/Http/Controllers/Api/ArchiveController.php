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
    public function index(Request $request)
    {
        $query = Archive::query()->with('category');

        if ($request->has('category_id') && $request->category_id !== 'all') {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        // Sorting
        $sortColumn = 'uploaded_at'; // Default sort
        $sortDirection = 'desc';

        if ($request->has('sort_by')) {
            switch ($request->sort_by) {
                case 'abjad': // Alphabetical
                    $sortColumn = 'title';
                    $sortDirection = 'asc';
                    break;
                case 'date': // Upload Date
                    $sortColumn = 'uploaded_at';
                    $sortDirection = $request->sort_order === 'asc' ? 'asc' : 'desc';
                    break;
                case 'size': // Size
                    $sortColumn = 'file_size';
                    $sortDirection = $request->sort_order === 'asc' ? 'asc' : 'desc';
                    break;
                default: // Default explicit
                    $sortColumn = 'uploaded_at';
                    $sortDirection = 'desc';
            }
        }

        $query->orderBy($sortColumn, $sortDirection);

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'title' => 'required|string|max:255',
            'year' => 'required|integer|digits:4',
            'uploaded_at' => 'nullable|date', // Optional custom date
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        try {
            $category = Category::findOrFail($request->category_id);

            // ... Google Client Init (Keep existing logic, omitted for brevity, verify context matches) ...
            // RE-INSERTING GOOGLE CLIENT INIT LOGIC HERE AS REPLACEMENT CONTENT MUST BE COMPLETE BLOCK Or TARGET SPECIFIC LINES

            if (!class_exists('\Google\Client')) {
                throw new \Exception('Google API Client not found.');
            }

            $client = new \Google\Client();
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

            if (!$category->drive_folder_id) {
                $folderMetadata = new \Google\Service\Drive\DriveFile([
                    'name' => $category->name,
                    'mimeType' => 'application/vnd.google-apps.folder',
                    'parents' => [config('filesystems.disks.google.folder_id')]
                ]);
                $folder = $service->files->create($folderMetadata, ['fields' => 'id']);
                $category->update(['drive_folder_id' => $folder->id]);
            }

            // Get File Info
            $uploadedFile = $request->file('file');
            $fileSize = $uploadedFile->getSize(); // Bytes
            $content = file_get_contents($uploadedFile->getRealPath());

            // Upload
            $fileMetadata = new \Google\Service\Drive\DriveFile([
                'name' => $request->title . '.pdf',
                'parents' => [$category->drive_folder_id]
            ]);

            $file = $service->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => 'application/pdf',
                'uploadType' => 'multipart',
                'fields' => 'id, webViewLink, webContentLink'
            ]);

            $archive = Archive::create([
                'category_id' => $category->id,
                'title' => $request->title,
                'year' => $request->year,
                'uploaded_at' => $request->uploaded_at ?? now(), // Use provided or now
                'file_size' => $fileSize,
                'drive_file_id' => $file->id,
                'view_link' => route('archives.view', $file->id)
            ]);

            return response()->json($archive, 201);

        } catch (\Exception $e) {
            \Log::error('Drive Upload Error: ' . $e->getMessage());
            return response()->json(['error' => 'Upload Error: ' . $e->getMessage()], 500);
        }
    }
}
