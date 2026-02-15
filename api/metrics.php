<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$pdo = db();

$totalCa = $pdo->query("SELECT COALESCE(SUM(amount), 0.00) FROM transactions WHERE type='debit'")->fetchColumn();
$totalTx = $pdo->query("SELECT COUNT(*) FROM transactions")->fetchColumn();
$totalBalances = $pdo->query("SELECT COALESCE(SUM(balance), 0.00) FROM wallets WHERE is_active=1")->fetchColumn();
$walletsActive = $pdo->query("SELECT COUNT(*) FROM wallets WHERE is_active=1")->fetchColumn();

$byStand = $pdo->query("SELECT stand_name, COALESCE(SUM(amount), 0.00) AS ca FROM transactions WHERE type='debit' GROUP BY stand_name ORDER BY stand_name")->fetchAll();

send_json([
  'total_ca' => (string)$totalCa,
  'total_transactions' => (int)$totalTx,
  'sum_active_balances' => (string)$totalBalances,
  'wallets_active' => (int)$walletsActive,
  'ca_by_stand' => $byStand,
]);

