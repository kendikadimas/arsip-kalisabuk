#!/bin/bash

# Script Deploy Arsip Kalisabuk
# Cara penggunaan: ./deploy.sh
# Pastikan script ini berada di: /home/desakal2/arsipkalisabuk/deploy.sh

# Konfigurasi Path
# PUBLIC_PATH mengarah ke folder subdomain arsip
PUBLIC_PATH="../public_html/arsip"
CORE_NAME="arsipkalisabuk"

echo "========================================"
echo "🚀 Memulai Deployment $CORE_NAME"
echo "========================================"

# 1. Git Pull
echo "📥 1. Mengambil update terbaru dari Git..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "⚠️ Git pull mengalami kendala, pastikan tidak ada konflik."
fi

# 2. Pindahkan isi folder public ke folder subdomain
echo "📂 2. Menyalin aset dari folder public ke $PUBLIC_PATH..."
# Pastikan folder tujuan ada
mkdir -p "$PUBLIC_PATH"

# Menyalin semua isi folder public ke subdomain
cp -r public/* "$PUBLIC_PATH/"

# Salin .htaccess jika ada
if [ -f "public/.htaccess" ]; then
    cp public/.htaccess "$PUBLIC_PATH/"
fi

# 3. Update index.php (Penting: Path disesuaikan untuk struktur folder Anda)
echo "📝 3. Memperbaharui index.php di $PUBLIC_PATH..."
cat > "$PUBLIC_PATH/index.php" << EOL
<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists(\$maintenance = __DIR__.'/../../$CORE_NAME/storage/framework/maintenance.php')) {
    require \$maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../../$CORE_NAME/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application \$app */
\$app = require_once __DIR__.'/../../$CORE_NAME/bootstrap/app.php';

\$app->handleRequest(Request::capture());
EOL

# 4. Fix Storage Symlink
echo "🔗 4. Memperbaiki Symbolic Link Storage..."
# Hapus link storage lama agar tidak error saat pembuatan ulang
rm -rf "$PUBLIC_PATH/storage"

# Buat symlink dari public_html/arsip/storage menuju arsipkalisabuk/storage/app/public
# Karena ini di server, kita gunakan path relatif dari sudut pandang folder public_html/arsip
ln -s "../../$CORE_NAME/storage/app/public" "$PUBLIC_PATH/storage"

# 5. Clear Cache Laravel
echo "🧹 5. Membersihkan cache aplikasi..."
php artisan optimize:clear

echo "========================================"
echo "✅ Deployment Selesai!"
echo "Website: arsip.desakalisabuk.com"
echo "========================================"