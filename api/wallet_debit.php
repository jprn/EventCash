<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$body = get_json_body();
$token = $body['qr_token'] ?? null;
$amount = amount_from($body['amount'] ?? null);
$productName = $body['product_name'] ?? null;
$standName = $body['stand_name'] ?? null;

if (!is_string($token) || $token === '') {
  send_json(['error' => 'missing_qr_token'], 400);
}
if ($productName !== null && !is_string($productName)) {
  send_json(['error' => 'invalid_product_name'], 400);
}
if (!is_string($standName) || $standName === '') {
  send_json(['error' => 'missing_stand_name'], 400);
}

$pdo = db();

try {
  $pdo->beginTransaction();

  $stmt = $pdo->prepare('SELECT id, balance, is_active FROM wallets WHERE qr_token = ? FOR UPDATE');
  $stmt->execute([$token]);
  $wallet = $stmt->fetch();
  if (!$wallet) {
    $pdo->rollBack();
    send_json(['error' => 'wallet_not_found'], 404);
  }
  if ((int)$wallet['is_active'] !== 1) {
    $pdo->rollBack();
    send_json(['error' => 'wallet_inactive'], 400);
  }

  $balance = (string)$wallet['balance'];
  if (compare_amount($balance, $amount) < 0) {
    $pdo->rollBack();
    send_json(['error' => 'insufficient_balance', 'balance' => $balance], 400);
  }

  $stmt = $pdo->prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?');
  $stmt->execute([$amount, $wallet['id']]);

  $txId = uuid_v4();
  $stmt = $pdo->prepare("INSERT INTO transactions (id, wallet_id, type, amount, product_name, stand_name) VALUES (?, ?, 'debit', ?, ?, ?)");
  $stmt->execute([$txId, $wallet['id'], $amount, $productName, $standName]);

  $stmt = $pdo->prepare('SELECT balance FROM wallets WHERE id = ?');
  $stmt->execute([$wallet['id']]);
  $newBalance = $stmt->fetchColumn();

  $pdo->commit();

  send_json([
    'transaction_id' => $txId,
    'wallet_id' => $wallet['id'],
    'balance' => (string)$newBalance,
  ]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  send_json(['error' => 'server_error'], 500);
}

