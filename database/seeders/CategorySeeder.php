<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $structure = [
            'Arsip Administrasi Desa' => [
                'Surat masuk dan surat keluar',
                'Buku agenda surat',
                'Keputusan Kepala Desa',
                'Peraturan Desa (Perdes)'
            ],
            'Arsip Kependudukan' => [
                'Data penduduk',
                'Surat keterangan (domisili, usaha, tidak mampu, dll)',
                'Data kelahiran, kematian, pindah datang',
                'Rekap layanan administrasi warga'
            ],
            'Arsip Keuangan Desa' => [
                'APBDes',
                'Laporan realisasi anggaran',
                'Bukti pengeluaran dan penerimaan',
                'Dokumen bantuan dan hibah'
            ],
            'Arsip Kegiatan dan Pembangunan' => [
                'Dokumentasi kegiatan desa',
                'Laporan kegiatan',
                'Proposal dan laporan pertanggungjawaban',
                'Dokumentasi pembangunan fisik'
            ],
            'Arsip Aset Desa' => [
                'Data tanah kas desa',
                'Inventaris barang milik desa',
                'Dokumen bangunan desa',
                'Kendaraan dan fasilitas desa'
            ],
            'Arsip Lembaga Desa' => [
                'Data BPD, PKK, Karang Taruna, LPMD',
                'SK kepengurusan',
                'Program kerja lembaga desa'
            ],
            'Arsip Kerja Sama dan Program' => [
                'Kerja sama dengan pihak luar',
                'Program dari pemerintah atau pihak lain',
                'Dokumen pendampingan dan KKN'
            ]
        ];

        // Init Google Client
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
        $rootFolderId = config('filesystems.disks.google.folder_id');

        foreach ($structure as $parentName => $subCategories) {
            $this->command->info("Processing: $parentName");

            // Check if parent exists in DB
            $parent = \App\Models\Category::where('name', $parentName)->whereNull('parent_id')->first();

            if (!$parent) {
                // Create Folder in Drive
                $folderMetadata = new \Google\Service\Drive\DriveFile([
                    'name' => $parentName,
                    'mimeType' => 'application/vnd.google-apps.folder',
                    'parents' => [$rootFolderId]
                ]);
                $folder = $service->files->create($folderMetadata, ['fields' => 'id']);

                $parent = \App\Models\Category::create([
                    'name' => $parentName,
                    'drive_folder_id' => $folder->id,
                    'parent_id' => null
                ]);
            }

            foreach ($subCategories as $childName) {
                $child = \App\Models\Category::where('name', $childName)->where('parent_id', $parent->id)->first();
                if (!$child) {
                    // Create Sub-Folder in Drive
                    $subFolderMetadata = new \Google\Service\Drive\DriveFile([
                        'name' => $childName,
                        'mimeType' => 'application/vnd.google-apps.folder',
                        'parents' => [$parent->drive_folder_id]
                    ]);
                    $subFolder = $service->files->create($subFolderMetadata, ['fields' => 'id']);

                    \App\Models\Category::create([
                        'name' => $childName,
                        'drive_folder_id' => $subFolder->id,
                        'parent_id' => $parent->id
                    ]);
                    $this->command->info("  - Created: $childName");
                }
            }
        }
    }
}
