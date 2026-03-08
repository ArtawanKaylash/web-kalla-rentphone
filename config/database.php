<?php
/**
 * KALLA RENTPHONE — config/database.php
 * Konfigurasi koneksi ke MySQL (XAMPP)
 * Ubah DB_USER / DB_PASS sesuai pengaturan XAMPP Anda.
 */

define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'kalla_rentphone');
define('DB_USER', 'root');   // default XAMPP
define('DB_PASS', '');       // default XAMPP (kosong)
define('DB_CHARSET', 'utf8mb4');

/**
 * Buat koneksi PDO (singleton)
 * @return PDO
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Koneksi DB gagal: ' . $e->getMessage()]));
    }

    return $pdo;
}
