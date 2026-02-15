<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$pdo = db();

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="transactions.csv"');

$out = fopen('php://output', 'w');
if ($out === false) {
  http_response_code(500);
  exit;
}

fputcsv($out, ['id', 'wallet_id', 'type', 'amount', 'product_name', 'stand_name', 'created_at']);

$stmt = $pdo->query('SELECT id, wallet_id, type, amount, product_name, stand_name, created_at FROM transactions ORDER BY created_at DESC');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  fputcsv($out, $row);
}

fclose($out);

