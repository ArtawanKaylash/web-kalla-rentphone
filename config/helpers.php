<?php
/**
 * KALLA RENTPHONE — config/helpers.php
 * Helper functions: JSON response, body parse, headers
 */

/** Kirim response JSON dan exit */
function jsonResponse(bool $success, string $message, array $data = []): void {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit;
}

/** Ambil body JSON dari request */
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

/** Set header CORS & Content-Type untuk semua API */
function setApiHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
}

/** Generate kode transaksi unik */
function generateTxCode(): string {
    return 'TX' . strtoupper(substr(uniqid(), -8));
}

/** Validasi tanggal format Y-m-d */
function isValidDate(string $d): bool {
    $dt = DateTime::createFromFormat('Y-m-d', $d);
    return $dt && $dt->format('Y-m-d') === $d;
}

/** Trim semua nilai string dari array */
function trimArray(array $data): array {
    return array_map(fn($v) => is_string($v) ? trim($v) : $v, $data);
}
