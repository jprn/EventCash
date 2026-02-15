<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$body = get_json_body();
$walletId = $body['wallet_id'] ?? null;

if (!is_string($walletId) || $walletId === '') {
  send_json(['error' => 'missing_wallet_id'], 400);
}

$pdo = db();

try {
  $pdo->beginTransaction();

  $stmt = $pdo->prepare('SELECT id, is_active FROM wallets WHERE id = ? FOR UPDATE');
  $stmt->execute([$walletId]);
  $wallet = $stmt->fetch();
  if (!$wallet) {
    $pdo->rollBack();
    send_json(['error' => 'wallet_not_found'], 404);
  }

  if ((int)$wallet['is_active'] === 1) {
    $pdo->rollBack();
    send_json(['error' => 'wallet_must_be_inactive'], 400);
  }

  $stmt = $pdo->prepare('SELECT COUNT(*) FROM transactions WHERE wallet_id = ?');
  $stmt->execute([$walletId]);
  $txCount = (int)$stmt->fetchColumn();
  if ($txCount > 0) {
    $pdo->rollBack();
    send_json(['error' => 'wallet_has_transactions'], 400);
  }

  $stmt = $pdo->prepare('DELETE FROM wallets WHERE id = ?');
  $stmt->execute([$walletId]);

  $pdo->commit();

  send_json(['wallet_id' => $walletId, 'deleted' => true]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  send_json(['error' => 'server_error'], 500);
}
