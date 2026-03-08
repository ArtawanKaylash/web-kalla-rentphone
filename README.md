# web-kalla-rentphone# KALLA RENTPHONE — Panduan Setup XAMPP

## Struktur Folder
```
kalla-rentphone-php/
├── index.html                  ← Halaman utama (buka di browser)
├── kalla_rentphone.sql         ← Import ke phpMyAdmin
├── config/
│   ├── database.php            ← Konfigurasi koneksi MySQL
│   └── helpers.php             ← Fungsi bantu (response, validasi)
├── api/
│   ├── auth.php                ← Login / Logout / Cek session
│   ├── phones.php              ← CRUD unit HP
│   ├── customers.php           ← CRUD pelanggan
│   ├── transactions.php        ← CRUD transaksi sewa
│   └── dashboard.php           ← Statistik dashboard
└── assets/
    ├── css/style.css           ← Tampilan (minimalist dark)
    └── js/app.js               ← Logic frontend (fetch ke API)
```

---

## Langkah Setup

### 1. Salin folder ke htdocs
Salin seluruh folder `kalla-rentphone-php` ke:
```
C:\xampp\htdocs\kalla-rentphone-php\
```

### 2. Jalankan XAMPP
- Buka **XAMPP Control Panel**
- Klik **Start** pada **Apache** dan **MySQL**

### 3. Import database
1. Buka browser → http://localhost/phpmyadmin
2. Klik tab **Import**
3. Klik **Choose File** → pilih file `kalla_rentphone.sql`
4. Klik **Go / Kirim**
5. Database `kalla_rentphone` otomatis terbuat beserta semua tabel

### 4. (Opsional) Sesuaikan koneksi
Edit file `config/database.php` jika password MySQL Anda berbeda:
```php
define('DB_USER', 'root');  // username MySQL
define('DB_PASS', '');      // password MySQL (kosong = default XAMPP)
```

### 5. Buka aplikasi
```
http://localhost/kalla-rentphone-php/
```

**Login:** username `admin` / password `admin123`

---

## Tabel Database

| Tabel          | Keterangan                          |
|----------------|-------------------------------------|
| `users`        | Akun login admin                    |
| `phones`       | Data unit HP yang disewakan         |
| `customers`    | Data pelanggan terdaftar            |
| `transactions` | Riwayat transaksi sewa              |
| `v_transactions` | View join transaksi + pelanggan + HP |
| `v_dashboard`  | View statistik ringkasan            |

---

## Endpoint API

| Method | URL                                      | Fungsi                  |
|--------|------------------------------------------|-------------------------|
| POST   | api/auth.php?action=login                | Login                   |
| POST   | api/auth.php?action=logout               | Logout                  |
| GET    | api/dashboard.php                        | Statistik dashboard     |
| GET    | api/phones.php                           | Semua HP                |
| POST   | api/phones.php                           | Tambah HP               |
| PUT    | api/phones.php?id=1                      | Update HP               |
| DELETE | api/phones.php?id=1                      | Hapus HP                |
| GET    | api/customers.php                        | Semua pelanggan         |
| POST   | api/customers.php                        | Tambah pelanggan        |
| PUT    | api/customers.php?id=1                   | Update pelanggan        |
| DELETE | api/customers.php?id=1                   | Hapus pelanggan         |
| GET    | api/transactions.php                     | Semua transaksi         |
| POST   | api/transactions.php                     | Buat transaksi baru     |
| PUT    | api/transactions.php?id=1&action=return  | Kembalikan HP           |
| DELETE | api/transactions.php?id=1                | Hapus transaksi         |
