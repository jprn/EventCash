<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$q = $_GET['q'] ?? '';
if (!is_string($q)) {
  send_json(['error' => 'invalid_query'], 400);
}
$q = trim($q);

$pdo = db();

if ($q !== '') {
  $like = '%' . $q . '%';
  $stmt = $pdo->prepare('SELECT id, qr_token, balance, is_active, created_at FROM wallets WHERE qr_token LIKE ? ORDER BY created_at DESC LIMIT 200');
  $stmt->execute([$like]);
} else {
  $stmt = $pdo->query('SELECT id, qr_token, balance, is_active, created_at FROM wallets ORDER BY created_at DESC LIMIT 200');
}

send_json(['wallets' => $stmt->fetchAll()]);
