<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$pdo = db();

$id = uuid_v4();
$token = random_token(32);

$stmt = $pdo->prepare('INSERT INTO wallets (id, qr_token, balance, is_active) VALUES (?, ?, 0.00, 1)');
$stmt->execute([$id, $token]);

send_json([
  'id' => $id,
  'qr_token' => $token,
  'balance' => '0.00',
  'is_active' => 1,
]);

