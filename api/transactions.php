<?php
/**
 * KALLA RENTPHONE — api/transactions.php
 * GET    /api/transactions.php           → semua transaksi (via view)
 * GET    /api/transactions.php?id=1      → satu transaksi
 * GET    /api/transactions.php?status=Aktif → filter status
 * POST   /api/transactions.php           → buat transaksi baru
 * PUT    /api/transactions.php?id=1&action=return → kembalikan HP
 * DELETE /api/transactions.php?id=1      → hapus transaksi
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setApiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$action = $_GET['action'] ?? '';

// ── GET ────────────────────────────────────────────────────
if ($method === 'GET') {
    if ($id > 0) {
        $stmt = $db->prepare('SELECT * FROM v_transactions WHERE id = ?');
        $stmt->execute([$id]);
        $tx = $stmt->fetch();
        if (!$tx) jsonResponse(false, 'Transaksi tidak ditemukan');
        jsonResponse(true, 'OK', ['data' => $tx]);
    }

    $status = $_GET['status'] ?? '';
    if ($status) {
        $stmt = $db->prepare('SELECT * FROM v_transactions WHERE status = ? ORDER BY created_at DESC');
        $stmt->execute([$status]);
    } else {
        $stmt = $db->query('SELECT * FROM v_transactions ORDER BY created_at DESC');
    }

    jsonResponse(true, 'OK', ['data' => $stmt->fetchAll()]);
}

// ── POST (buat transaksi baru) ─────────────────────────────
if ($method === 'POST') {
    $body       = trimArray(getJsonBody());
    $customerId = (int)($body['customer_id'] ?? 0);
    $phoneId    = (int)($body['phone_id']    ?? 0);
    $startDate  = $body['start_date'] ?? '';
    $endDate    = $body['end_date']   ?? '';

    // Validasi
    if (!$customerId || !$phoneId || !$startDate || !$endDate) {
        jsonResponse(false, 'customer_id, phone_id, start_date, end_date wajib diisi!');
    }
    if (!isValidDate($startDate) || !isValidDate($endDate)) {
        jsonResponse(false, 'Format tanggal tidak valid (Y-m-d)');
    }

    $start = new DateTime($startDate);
    $end   = new DateTime($endDate);
    if ($end <= $start) {
        jsonResponse(false, 'Tanggal selesai harus setelah tanggal mulai!');
    }

    // Cek pelanggan
    $cStmt = $db->prepare('SELECT id FROM customers WHERE id = ?');
    $cStmt->execute([$customerId]);
    if (!$cStmt->fetch()) jsonResponse(false, 'Pelanggan tidak ditemukan!');

    // Cek HP tersedia
    $pStmt = $db->prepare("SELECT * FROM phones WHERE id = ? AND status = 'Tersedia'");
    $pStmt->execute([$phoneId]);
    $phone = $pStmt->fetch();
    if (!$phone) jsonResponse(false, 'HP tidak tersedia!');

    $days       = (int)$end->diff($start)->days;
    $pricePerDay = (int)$phone['price_day'];
    $totalCost  = $days * $pricePerDay;
    $txCode     = generateTxCode();

    try {
        $db->beginTransaction();

        $ins = $db->prepare('
            INSERT INTO transactions
              (tx_code, customer_id, phone_id, start_date, end_date, days, price_per_day, total_cost, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'Aktif\')
        ');
        $ins->execute([$txCode, $customerId, $phoneId, $startDate, $endDate, $days, $pricePerDay, $totalCost]);
        $newId = (int)$db->lastInsertId();

        $db->prepare("UPDATE phones SET status='Disewa' WHERE id=?")->execute([$phoneId]);

        $db->commit();
        jsonResponse(true, 'Transaksi berhasil dibuat!', [
            'id'         => $newId,
            'tx_code'    => $txCode,
            'total_cost' => $totalCost,
            'days'       => $days,
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(false, 'Gagal membuat transaksi: ' . $e->getMessage());
    }
}

// ── PUT (kembalikan HP) ────────────────────────────────────
if ($method === 'PUT' && $action === 'return') {
    if (!$id) jsonResponse(false, 'ID wajib disertakan!');

    $tx = $db->prepare("SELECT * FROM transactions WHERE id = ? AND status='Aktif'");
    $tx->execute([$id]);
    $row = $tx->fetch();
    if (!$row) jsonResponse(false, 'Transaksi tidak ditemukan atau sudah selesai!');

    try {
        $db->beginTransaction();
        $db->prepare("UPDATE transactions SET status='Selesai', returned_at=NOW() WHERE id=?")->execute([$id]);
        $db->prepare("UPDATE phones SET status='Tersedia' WHERE id=?")->execute([$row['phone_id']]);
        $db->commit();
        jsonResponse(true, 'HP berhasil dikembalikan!');
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(false, 'Gagal memproses pengembalian: ' . $e->getMessage());
    }
}

// ── DELETE ─────────────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$id) jsonResponse(false, 'ID wajib disertakan!');

    $tx = $db->prepare("SELECT * FROM transactions WHERE id=?");
    $tx->execute([$id]);
    $row = $tx->fetch();
    if (!$row) jsonResponse(false, 'Transaksi tidak ditemukan');

    // Jika masih aktif, bebaskan HP dulu
    if ($row['status'] === 'Aktif') {
        $db->prepare("UPDATE phones SET status='Tersedia' WHERE id=?")->execute([$row['phone_id']]);
    }

    $db->prepare('DELETE FROM transactions WHERE id=?')->execute([$id]);
    jsonResponse(true, 'Transaksi berhasil dihapus!');
}

jsonResponse(false, 'Method tidak diizinkan');
