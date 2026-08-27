<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_role('recharge');

$pdo = db();

$id = uuid_v4();
$token = random_token(32);
$pin = random_pin(4);

$stmt = $pdo->prepare('INSERT INTO wallets (id, qr_token, pin, balance, is_active) VALUES (?, ?, ?, 0.00, 1)');
$stmt->execute([$id, $token, $pin]);

send_json([
  'id' => $id,
  'qr_token' => $token,
  'pin' => $pin,
  'balance' => '0.00',
  'is_active' => 1,
]);

