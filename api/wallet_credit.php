<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$body = get_json_body();
$walletId = $body['wallet_id'] ?? null;
$amount = amount_from($body['amount'] ?? null);

if (!is_string($walletId) || $walletId === '') {
  send_json(['error' => 'missing_wallet_id'], 400);
}

$pdo = db();

try {
  $pdo->beginTransaction();

  $stmt = $pdo->prepare('SELECT id, balance, is_active FROM wallets WHERE id = ? FOR UPDATE');
  $stmt->execute([$walletId]);
  $wallet = $stmt->fetch();
  if (!$wallet) {
    $pdo->rollBack();
    send_json(['error' => 'wallet_not_found'], 404);
  }
  if ((int)$wallet['is_active'] !== 1) {
    $pdo->rollBack();
    send_json(['error' => 'wallet_inactive'], 400);
  }

  $stmt = $pdo->prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?');
  $stmt->execute([$amount, $walletId]);

  $txId = uuid_v4();
  $stmt = $pdo->prepare("INSERT INTO transactions (id, wallet_id, type, amount, product_name, stand_name) VALUES (?, ?, 'credit', ?, NULL, 'Recharge')");
  $stmt->execute([$txId, $walletId, $amount]);

  $stmt = $pdo->prepare('SELECT balance FROM wallets WHERE id = ?');
  $stmt->execute([$walletId]);
  $newBalance = $stmt->fetchColumn();

  $pdo->commit();

  send_json([
    'transaction_id' => $txId,
    'wallet_id' => $walletId,
    'balance' => (string)$newBalance,
  ]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  send_json(['error' => 'server_error'], 500);
}

