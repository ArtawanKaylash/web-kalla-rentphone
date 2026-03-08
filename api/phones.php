<?php
/**
 * KALLA RENTPHONE — api/phones.php
 * GET    /api/phones.php              → semua HP
 * GET    /api/phones.php?id=1         → satu HP
 * GET    /api/phones.php?status=Tersedia → filter status
 * POST   /api/phones.php              → tambah HP
 * PUT    /api/phones.php?id=1         → update HP
 * DELETE /api/phones.php?id=1         → hapus HP
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
        $stmt = $db->prepare('SELECT * FROM phones WHERE id = ?');
        $stmt->execute([$id]);
        $phone = $stmt->fetch();
        if (!$phone) jsonResponse(false, 'HP tidak ditemukan');
        jsonResponse(true, 'OK', ['data' => $phone]);
    }

    $status = $_GET['status'] ?? '';
    if ($status) {
        $stmt = $db->prepare('SELECT * FROM phones WHERE status = ? ORDER BY brand, model');
        $stmt->execute([$status]);
    } else {
        $stmt = $db->query('SELECT * FROM phones ORDER BY brand, model');
    }

    jsonResponse(true, 'OK', ['data' => $stmt->fetchAll()]);
}

// ── POST (tambah) ──────────────────────────────────────────
if ($method === 'POST') {
    $body = trimArray(getJsonBody());

    $brand     = $body['brand']     ?? '';
    $model     = $body['model']     ?? '';
    $color     = $body['color']     ?? '';
    $storage   = (int)($body['storage']   ?? 0);
    $condition = $body['condition'] ?? 'Baik';
    $priceDay  = (int)($body['price_day'] ?? 0);
    $imei      = $body['imei']      ?? null;
    $status    = $body['status']    ?? 'Tersedia';
    $notes     = $body['notes']     ?? '';

    if (!$brand || !$model || $priceDay <= 0) {
        jsonResponse(false, 'Merek, Model, dan Harga wajib diisi!');
    }
    if ($imei && strlen($imei) !== 15) {
        jsonResponse(false, 'IMEI harus 15 digit!');
    }

    // Cek duplikat IMEI
    if ($imei) {
        $chk = $db->prepare('SELECT id FROM phones WHERE imei = ?');
        $chk->execute([$imei]);
        if ($chk->fetch()) jsonResponse(false, 'IMEI sudah terdaftar!');
    }

    $stmt = $db->prepare('
        INSERT INTO phones (brand, model, color, storage, `condition`, price_day, imei, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$brand, $model, $color, $storage, $condition, $priceDay, $imei ?: null, $status, $notes]);

    jsonResponse(true, 'HP berhasil ditambahkan!', ['id' => (int)$db->lastInsertId()]);
}

// ── PUT (update) ───────────────────────────────────────────
if ($method === 'PUT') {
    if (!$id) jsonResponse(false, 'ID wajib disertakan!');
    $body = trimArray(getJsonBody());

    $fields = [];
    $params = [];

    $allowed = ['brand','model','color','storage','condition','price_day','imei','status','notes'];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $body)) {
            $fields[] = "`$f` = ?";
            $params[] = $body[$f] === '' ? null : $body[$f];
        }
    }

    if (empty($fields)) jsonResponse(false, 'Tidak ada data yang diubah');

    if (isset($body['imei']) && $body['imei']) {
        $chk = $db->prepare('SELECT id FROM phones WHERE imei = ? AND id != ?');
        $chk->execute([$body['imei'], $id]);
        if ($chk->fetch()) jsonResponse(false, 'IMEI sudah digunakan HP lain!');
    }

    $params[] = $id;
    $sql = 'UPDATE phones SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(true, 'Data HP berhasil diperbarui!');
}

// ── DELETE ─────────────────────────────────────────────────
if ($method === 'DELETE') {
    if (!$id) jsonResponse(false, 'ID wajib disertakan!');

    // Cek transaksi aktif
    $chk = $db->prepare("SELECT id FROM transactions WHERE phone_id = ? AND status = 'Aktif' LIMIT 1");
    $chk->execute([$id]);
    if ($chk->fetch()) jsonResponse(false, 'HP sedang disewa, tidak bisa dihapus!');

    $db->prepare('DELETE FROM phones WHERE id = ?')->execute([$id]);
    jsonResponse(true, 'HP berhasil dihapus!');
}

jsonResponse(false, 'Method tidak diizinkan');
