<?php

declare(strict_types=1);

session_start();

$role = $EVENCASH_ROLE ?? '';
if ($role === '') {
  http_response_code(500);
  exit('Rôle non défini');
}

if (($_SESSION['role'] ?? '') !== $role) {
  $redirect = urlencode($_SERVER['REQUEST_URI'] ?? '/');
  header('Location: /api/login.php?role=' . urlencode($role) . '&redirect=' . $redirect);
  exit;
}
