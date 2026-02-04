<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Google Drive OAuth Routes
Route::get('/google/auth', function () {
    $client = new \Google\Client();
    $client->setClientId(config('filesystems.disks.google.client_id'));
    $client->setClientSecret(config('filesystems.disks.google.client_secret'));
    $client->setRedirectUri(config('filesystems.disks.google.redirect_uri'));
    $client->addScope(\Google\Service\Drive::DRIVE);
    $client->setAccessType('offline');
    $client->setPrompt('consent');

    return redirect($client->createAuthUrl());
})->name('google.auth');

Route::get('/google/callback', function (Request $request) {
    if (!$request->has('code')) {
        return "Gagal mendapatkan kode otorisasi.";
    }

    $client = new \Google\Client();
    $client->setClientId(config('filesystems.disks.google.client_id'));
    $client->setClientSecret(config('filesystems.disks.google.client_secret'));
    $client->setRedirectUri(config('filesystems.disks.google.redirect_uri'));

    // Fix for local development SSL issues (cURL error 60)
    if (app()->environment('local')) {
        $httpClient = new \GuzzleHttp\Client(['verify' => false]);
        $client->setHttpClient($httpClient);
    }

    $token = $client->fetchAccessTokenWithAuthCode($request->code);

    if (isset($token['refresh_token'])) {
        return "<h3>Berhasil!</h3><p>Salin Refresh Token ini dan masukkan ke file <b>.env</b> Anda:</p><textarea style='width:100%;height:100px;'>" . $token['refresh_token'] . "</textarea><br><p>Setelah itu, simpan file .env dan restart server.</p>";
    }

    return "Gagal mendapatkan Refresh Token. Pastikan Anda mencentang izin akses Drive saat login.";
})->name('google.callback');

use App\Models\Category;
use App\Models\Archive;
use Google\Client as GoogleClient;
use Google\Service\Drive as GoogleDrive;
use Google\Service\Drive\DriveFile;

Route::get('dashboard', function (Request $request) {
    $categories = Category::whereNull('parent_id')->withCount('archives')->get();

    $query = Archive::with('category');

    // Global Search
    if ($request->has('search') && $request->search != '') {
        $query->where('title', 'like', '%' . $request->search . '%');
    }

    // Filter Year (from 'year' column)
    if ($request->has('year') && $request->year != '' && $request->year != 'all') {
        $query->where('year', $request->year);
    }

    $archives = $query->latest()->get();

    return Inertia::render('dashboard', [
        'categories' => $categories,
        'archives' => $archives,
        'filters' => $request->only(['search', 'year'])
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::post('/categories', function (Request $request) {
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'parent_id' => 'nullable|exists:categories,id',
    ]);

    try {
        // Init Google Client
        $client = new GoogleClient();

        // Fix for local development SSL issues (cURL error 60)
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

        $client->addScope(GoogleDrive::DRIVE);
        $service = new GoogleDrive($client);

        // Determine Parent Folder ID
        $parentDriveId = config('filesystems.disks.google.folder_id');
        if (!empty($validated['parent_id'])) {
            $parentCategory = Category::find($validated['parent_id']);
            if ($parentCategory && $parentCategory->drive_folder_id) {
                $parentDriveId = $parentCategory->drive_folder_id;
            }
        }

        // Create Folder in Drive
        $folderMetadata = new DriveFile([
            'name' => $validated['name'],
            'mimeType' => 'application/vnd.google-apps.folder',
            'parents' => [$parentDriveId]
        ]);

        $folder = $service->files->create($folderMetadata, ['fields' => 'id']);

        Category::create([
            'name' => $validated['name'],
            'drive_folder_id' => $folder->id,
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        return redirect()->back();
    } catch (\Exception $e) {
        return redirect()->back()->withErrors(['name' => 'Google Drive Error: ' . $e->getMessage()]);
    }
})->middleware(['auth', 'verified'])->name('categories.store');

Route::get('/categories/{category}', function (Category $category) {
    $archives = Archive::where('category_id', $category->id)->latest()->get();
    $children = Category::where('parent_id', $category->id)->withCount('archives')->get();

    // Breadcrumbs
    $breadcrumbs = [];
    $curr = $category;
    while ($curr->parent_id) {
        $curr = Category::find($curr->parent_id);
        if ($curr) {
            array_unshift($breadcrumbs, [
                'title' => $curr->name,
                'href' => route('categories.show', $curr->id)
            ]);
        }
    }
    array_unshift($breadcrumbs, ['title' => 'Beranda', 'href' => route('dashboard')]);
    $breadcrumbs[] = ['title' => $category->name, 'href' => '#'];

    return Inertia::render('categories/show', [
        'category' => $category,
        'archives' => $archives,
        'children' => $children,
        'breadcrumbs' => $breadcrumbs
    ]);
})->middleware(['auth', 'verified'])->name('categories.show');

Route::patch('/categories/{category}', function (Request $request, Category $category) {
    $validated = $request->validate([
        'name' => 'required|string|max:255',
    ]);

    try {
        // Init Google Client
        $client = new GoogleClient();
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

        $service = new GoogleDrive($client);

        // Rename Folder in Drive if exists
        if ($category->drive_folder_id) {
            $folderMetadata = new DriveFile([
                'name' => $validated['name'],
            ]);
            $service->files->update($category->drive_folder_id, $folderMetadata);
        }

        $category->update(['name' => $validated['name']]);

        return redirect()->back();
    } catch (\Exception $e) {
        return redirect()->back()->withErrors(['name' => 'Google Drive Error: ' . $e->getMessage()]);
    }
})->middleware(['auth', 'verified'])->name('categories.update');

Route::patch('/archives/{archive}', function (Request $request, Archive $archive) {
    $validated = $request->validate([
        'title' => 'required|string|max:255',
        'year' => 'required|integer|digits:4',
    ]);

    $archive->update($validated);

    return redirect()->back();
})->middleware(['auth', 'verified'])->name('archives.update');



Route::get('/scanner', function () {
    return Inertia::render('Scanner', [
        'categories' => Category::all()
    ]);
})->middleware(['auth', 'verified'])->name('scanner');

Route::get('/upload', function () {
    return Inertia::render('Upload', [
        'categories' => Category::all()
    ]);
})->middleware(['auth', 'verified'])->name('upload');

Route::delete('/categories/{category}', function (Category $category) {
    try {
        // Init Google Client
        $client = new GoogleClient();
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

        $service = new GoogleDrive($client);

        // Delete Folder in Drive if exists
        if ($category->drive_folder_id) {
            $service->files->delete($category->drive_folder_id);
        }

        $category->delete();

        return redirect()->route('dashboard');
    } catch (\Exception $e) {
        return redirect()->back()->withErrors(['error' => 'Google Drive Error: ' . $e->getMessage()]);
    }
})->middleware(['auth', 'verified'])->name('categories.destroy');

Route::delete('/archives/{archive}', function (Archive $archive) {
    try {
        // Init Google Client
        $client = new GoogleClient();
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

        $service = new GoogleDrive($client);

        // Delete File in Drive if exists
        if ($archive->drive_file_id) {
            $service->files->delete($archive->drive_file_id);
        }

        $archive->delete();

        return redirect()->back();
    } catch (\Exception $e) {
        return redirect()->back()->withErrors(['error' => 'Google Drive Error: ' . $e->getMessage()]);
    }
})->middleware(['auth', 'verified'])->name('archives.destroy');

Route::get('/archives/view/{fileId}', function ($fileId) {
    try {
        $client = new GoogleClient();
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

        $service = new GoogleDrive($client);

        $response = $service->files->get($fileId, ['alt' => 'media']);
        $content = $response->getBody()->getContents();

        return response($content)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="document.pdf"');

    } catch (\Exception $e) {
        \Log::error('View Error: ' . $e->getMessage());
        return abort(404, 'File tidak ditemukan atau akses ditolak.');
    }
})->middleware(['auth', 'verified'])->name('archives.view');

require __DIR__ . '/settings.php';
