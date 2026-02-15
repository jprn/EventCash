<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

require_api_key();

$stand = $_GET['stand'] ?? null;
if ($stand !== null && !is_string($stand)) {
  send_json(['error' => 'invalid_stand'], 400);
}

$pdo = db();

if (is_string($stand) && $stand !== '') {
  $stmt = $pdo->prepare('SELECT id, name, price, stand, is_active FROM products WHERE stand = ? AND is_active = 1 ORDER BY name');
  $stmt->execute([$stand]);
} else {
  $stmt = $pdo->query('SELECT id, name, price, stand, is_active FROM products WHERE is_active = 1 ORDER BY stand, name');
}

send_json(['products' => $stmt->fetchAll()]);

