<?php
/**
 * KALLA RENTPHONE — api/dashboard.php
 * GET /api/dashboard.php  → statistik lengkap dashboard
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setApiHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(false, 'Method tidak diizinkan');
}

$db = getDB();

// Ambil stats dari view
$stats = $db->query('SELECT * FROM v_dashboard')->fetch();

// Transaksi terbaru (5)
$recent = $db->query('SELECT * FROM v_transactions ORDER BY created_at DESC LIMIT 5')->fetchAll();

// Stok per merek
$stock = $db->query('
    SELECT brand,
           COUNT(*) AS total,
           SUM(status=\'Tersedia\') AS available,
           SUM(status=\'Disewa\')   AS rented
    FROM phones
    GROUP BY brand
    ORDER BY brand
')->fetchAll();

jsonResponse(true, 'OK', [
    'stats'  => $stats,
    'recent' => $recent,
    'stock'  => $stock,
]);
