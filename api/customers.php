<?php
/**
 * KALLA RENTPHONE — api/customers.php
 * GET    /api/customers.php           → semua pelanggan
 * GET    /api/customers.php?id=1      → satu pelanggan
 * GET    /api/customers.php?q=nama    → search
 * POST   /api/customers.php           → tambah pelanggan
 * PUT    /api/customers.php?id=1      → update pelanggan
 * DELETE /api/customers.php?id=1      → hapus pelanggan
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setApiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// ── GET ────────────────────────────────────────────────────
if ($method === 'GET') {
    if ($id > 0) {
        $stmt = $db->prepare('SELECT * FROM customers WHERE id = ?');
        $stmt->execute([$id]);
        $cust = $stmt->fetch();
        if (!$cust) jsonResponse(false, 'Pelanggan tidak ditemukan');

        // ambil riwayat transaksi pelanggan
        $txStmt = $db->prepare('SELECT * FROM v_transactions WHERE customer_id = ? ORDER BY created_at DESC');
        $txStmt->execute([$id]);

        jsonResponse(true, 'OK', ['data' => $cust, 'transactions' => $txStmt->fetchAll()]);
    }

    $q = $_GET['q'] ?? '';
    if ($q) {
        $like = '%' . $q . '%';
        $stmt = $db->prepare('
            SELECT c.*,
                   COUNT(t.id)           AS tx_count,
                   IFNULL(SUM(t.total_cost),0) AS tx_total
            FROM customers c
            LEFT JOIN transactions t ON t.customer_id = c.id
            WHERE c.name LIKE ? OR c.nik LIKE ? OR c.phone LIKE ?
            GROUP BY c.id
            ORDER BY c.name
        ');
        $stmt->execute([$like, $like, $like]);
    } else {
        $stmt = $db->query('
            SELECT c.*,
                   COUNT(t.id)           AS tx_count,
                   IFNULL(SUM(t.total_cost),0) AS tx_total
            FROM customers c
            LEFT JOIN transactions t ON t.customer_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        ');
    }

    jsonResponse(true, 'OK', ['data' => $stmt->fetchAll()]);
}

// ── POST (tambah) ──────────────────────────────────────────
if ($method === 'POST') {
    $body  = trimArray(getJsonBody());
    $name  = $body['name']    ?? '';
    $nik   = $body['nik']     ?? '';
    $phone = $body['phone']   ?? '';
    $addr  = $body['address'] ?? '';
    $dob   = $body['dob']     ?? null;
    $notes = $body['notes']   ?? '';

    if (!$name || !$nik || !$phone) {
        jsonResponse(false, 'Nama, NIK, dan No. HP wajib diisi!');
    }
    if (strlen($nik) !== 16) {
        jsonResponse(false, 'NIK harus 16 digit!');
    }

    $chk = $db->prepare('SELECT id FROM customers WHERE nik = ?');
    $chk->execute([$nik]);
    if ($chk->fetch()) jsonResponse(false, 'NIK sudah terdaftar!');

    $stmt = $db->prepare('
        INSERT INTO customers (name, nik, phone, address, dob, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$name, $nik, $phone, $addr, $dob ?: null, $notes]);

    jsonResponse(true, 'Pelanggan berhasil ditambahkan!', ['id' => (int)$db->lastInsertId()]);
}

// ── PUT (update) ───────────────────────────────────────────
if ($method === 'PUT') {
    if (!$id) jsonResponse(false, 'ID wajib disertakan!');
    $body = trimArray(getJsonBody());

    $allowed = ['name','nik','phone','address','dob','notes'];
    $fields  = [];
    $params  = [];

    foreach ($allowed as $f) {
        if (array_key_exists($f, $body)) {
            $fields[] = "`$f` = ?";
            $params[] = $body[$f] === '' ? null : $body[$f];
        }
    }

    if (empty($fields)) jsonResponse(false, 'Tidak ada data yang diubah');

    // Cek duplikat NIK
    if (isset($body['nik'])) {
        $chk = $db->prepare('SELECT id FROM customers WHERE nik = ? AND id != ?');
        $chk->execute([$body['nik'], $id]);
        if ($chk->fetch()) jsonResponse(false, 'NIK sudah digunakan pelanggan lain!');
    }

    $params[] = $id;
    $sql = 'UPDATE customers SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $db->prepare($sql)->execute($params);

    jsonResponse(true, 'Data pelanggan berhasil diperbarui!');
}

// ── DELETE ─────────────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$id) jsonResponse(false, 'ID wajib disertakan!');
    $db->prepare('DELETE FROM customers WHERE id = ?')->execute([$id]);
    jsonResponse(true, 'Pelanggan berhasil dihapus!');
}

jsonResponse(false, 'Method tidak diizinkan');
