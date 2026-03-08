<?php
/**
 * KALLA RENTPHONE — api/auth.php
 * Endpoint: POST /api/auth.php?action=login
 *           POST /api/auth.php?action=logout
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

setApiHeaders();
session_start();

$action = $_GET['action'] ?? '';

switch ($action) {

    // ── LOGIN ──────────────────────────────────────────────
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(false, 'Method not allowed');
        }

        $body     = trimArray(getJsonBody());
        $username = $body['username'] ?? '';
        $password = $body['password'] ?? '';

        if (!$username || !$password) {
            jsonResponse(false, 'Username dan password wajib diisi!');
        }

        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        // Cek password: support plain-text (untuk demo) DAN bcrypt
        $valid = $user && (
            password_verify($password, $user['password']) ||
            $password === $user['password']   // fallback plain-text dev only
        );

        if (!$valid) {
            jsonResponse(false, 'Username atau password salah!');
        }

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['username']  = $user['username'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['role']      = $user['role'];

        jsonResponse(true, 'Login berhasil', [
            'user' => [
                'id'       => $user['id'],
                'username' => $user['username'],
                'fullName' => $user['full_name'],
                'role'     => $user['role'],
            ]
        ]);
        break;

    // ── LOGOUT ─────────────────────────────────────────────
    case 'logout':
        session_destroy();
        jsonResponse(true, 'Logout berhasil');
        break;

    // ── CHECK SESSION ───────────────────────────────────────
    case 'check':
        if (!empty($_SESSION['user_id'])) {
            jsonResponse(true, 'Session aktif', [
                'user' => [
                    'id'       => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'fullName' => $_SESSION['full_name'],
                    'role'     => $_SESSION['role'],
                ]
            ]);
        }
        jsonResponse(false, 'Belum login');
        break;

    default:
        jsonResponse(false, 'Action tidak dikenal');
}
