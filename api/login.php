<?php

declare(strict_types=1);

require_once __DIR__ . '/secrets.php';
require_once __DIR__ . '/http.php';

session_start();

$validPins = [
  'admin' => EVENCASH_ADMIN_PIN,
  'seller' => EVENCASH_SELLER_PIN,
  'recharge' => EVENCASH_RECHARGE_PIN,
];

$isJson = false;
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (is_string($contentType) && stripos($contentType, 'application/json') !== false) {
  $isJson = true;
}

function allowedRedirect(string $redirect): string {
  if ($redirect === '' || !str_starts_with($redirect, '/')) {
    return '/';
  }
  return $redirect;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if ($isJson) {
    $body = get_json_body();
    $role = $body['role'] ?? '';
    $pin = $body['pin'] ?? '';
  } else {
    $role = $_POST['role'] ?? '';
    $pin = $_POST['pin'] ?? '';
  }

  if (!is_string($role) || !is_string($pin) || !isset($validPins[$role])) {
    if ($isJson) {
      send_json(['error' => 'invalid_role'], 400);
    }
    $error = 'Rôle invalide';
  } elseif (!hash_equals($validPins[$role], $pin)) {
    if ($isJson) {
      send_json(['error' => 'unauthorized'], 403);
    }
    $error = 'Code incorrect';
  } else {
    $_SESSION['role'] = $role;
    $redirect = allowedRedirect($_POST['redirect'] ?? ($_GET['redirect'] ?? '/'));
    if ($isJson) {
      send_json(['ok' => true]);
    }
    header('Location: ' . $redirect);
    exit;
  }
}

$role = $_GET['role'] ?? $_POST['role'] ?? '';
if (!is_string($role) || !isset($validPins[$role])) {
  $role = 'admin';
}
$roleDisplay = htmlspecialchars($role, ENT_QUOTES, 'UTF-8');
$roleInput = $roleDisplay;
$redirect = allowedRedirect($_GET['redirect'] ?? $_POST['redirect'] ?? '/');
$redirectInput = htmlspecialchars($redirect, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connexion - EvenCash</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.08); text-align: center; width: 320px; }
      h1 { font-size: 24px; color: #0f172a; margin: 0 0 20px; }
      input, button { width: 100%; padding: 12px; font-size: 16px; border-radius: 8px; box-sizing: border-box; }
      input { border: 1px solid #cbd5e1; margin-bottom: 12px; text-align: center; }
      button { border: none; background: #0f172a; color: #fff; cursor: pointer; }
      .err { color: #dc2626; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Accès <?php echo $roleDisplay; ?></h1>
      <?php if ($error !== ''): ?><div class="err"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div><?php endif; ?>
      <form method="post" action="">
        <input type="hidden" name="role" value="<?php echo $roleInput; ?>" />
        <input type="hidden" name="redirect" value="<?php echo $redirectInput; ?>" />
        <input name="pin" type="password" inputmode="numeric" placeholder="Code PIN" autocomplete="off" autofocus />
        <button type="submit">Valider</button>
      </form>
    </div>
  </body>
</html>
