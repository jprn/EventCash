<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function send_json($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function get_json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || trim($raw) === '') {
    return [];
  }
  $data = json_decode($raw, true);
  if (!is_array($data)) {
    send_json(['error' => 'invalid_json'], 400);
  }
  return $data;
}

function require_api_key(): void {
  $key = $_SERVER['HTTP_X_EVENCASH_KEY'] ?? '';

  if (!is_string($key) || $key === '') {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (is_string($auth) && preg_match('/^Bearer\s+(.+)$/i', trim($auth), $m)) {
      $key = $m[1];
    }
  }

  if (!is_string($key) || $key === '') {
    $key = $_GET['key'] ?? '';
  }

  if (!is_string($key) || $key === '') {
    $key = $_POST['key'] ?? '';
  }

  if (!is_string($key) || $key !== EVENCASH_API_KEY) {
    send_json(['error' => 'unauthorized'], 401);
  }
}

function uuid_v4(): string {
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function random_token(int $bytes = 32): string {
  return bin2hex(random_bytes($bytes));
}

function amount_from($value): string {
  if (is_int($value) || is_float($value) || (is_string($value) && $value !== '')) {
    $n = (float)$value;
    if (!is_finite($n) || $n <= 0) {
      send_json(['error' => 'invalid_amount'], 400);
    }
    return number_format(round($n, 2), 2, '.', '');
  }
  send_json(['error' => 'invalid_amount'], 400);
}

function compare_amount(string $left, string $right): int {
  $l = number_format(round((float)$left, 2), 2, '.', '');
  $r = number_format(round((float)$right, 2), 2, '.', '');

  if (function_exists('bccomp')) {
    return bccomp($l, $r, 2);
  }

  $lf = (float)$l;
  $rf = (float)$r;
  $eps = 0.000001;
  if (abs($lf - $rf) < $eps) {
    return 0;
  }
  return ($lf < $rf) ? -1 : 1;
}

