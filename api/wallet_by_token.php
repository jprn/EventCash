<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$token = $_GET['token'] ?? '';
if (!is_string($token) || $token === '') {
  send_json(['error' => 'missing_token'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT id, balance, is_active, created_at, qr_token FROM wallets WHERE qr_token = ? LIMIT 1');
$stmt->execute([$token]);
$row = $stmt->fetch();
if (!$row) {
  send_json(['error' => 'wallet_not_found'], 404);
}

send_json(['wallet' => $row]);

