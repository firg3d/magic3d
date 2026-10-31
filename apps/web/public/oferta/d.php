<?php
/**
 * Magic3D - pagina de descarcare a unei cereri de oferta, pentru atelier.
 *
 * d.php?id=<32 hex>            pagina cu fisierele si data expirarii
 * d.php?id=<32 hex>&f=3mf|stl|png   fisierul insusi
 *
 * Fara id corect nu se vede nimic; nu exista lista de trimiteri. Paginile nu se indexeaza.
 */

require __DIR__ . '/_comun.php';

header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
oferta_curata();

$id = oferta_id_valid($_GET['id'] ?? null);
$sub = $id ? oferta_director() . '/' . $id : null;
$meta = $sub ? @json_decode((string) @file_get_contents($sub . '/meta.json'), true) : null;

if (!is_array($meta)) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Magic3D</title>'
        . '<p style="font-family:sans-serif;padding:2rem">Linkul a expirat sau nu exista. / This link has expired or does not exist.</p>';
    exit;
}

$tipuri = ['3mf' => 'model/3mf', 'stl' => 'model/stl', 'png' => 'image/png'];
$f = $_GET['f'] ?? null;
if ($f !== null) {
    if (!isset($tipuri[$f]) || !in_array($f, $meta['fisiere'] ?? [], true) || !is_file($sub . '/model.' . $f)) {
        http_response_code(404);
        exit;
    }
    $cale = $sub . '/model.' . $f;
    header('Content-Type: ' . $tipuri[$f]);
    header('Content-Length: ' . filesize($cale));
    header('Content-Disposition: ' . ($f === 'png' ? 'inline' : 'attachment') . '; filename="magic3d-' . substr($id, 0, 8) . '.' . $f . '"');
    header('Cache-Control: private, no-store');
    readfile($cale);
    exit;
}

$zile = (int) oferta_config()['expirare_zile'];
$expira = date('d.m.Y', (int) $meta['creat'] + $zile * 86400);
$e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
header('Content-Type: text/html; charset=utf-8');
?><!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Magic3D - fisiere pentru oferta</title>
  <style>
    body{margin:0;font-family:"Segoe UI",Arial,sans-serif;background:#f6f8f6;color:#1b2433}
    main{max-width:640px;margin:0 auto;padding:32px 16px}
    h1{font-size:22px;margin:0 0 4px}
    p{color:#4b5563}
    img{max-width:100%;border:1px solid #dfe5e0;border-radius:10px;background:#fff}
    a.btn{display:inline-block;margin:6px 8px 6px 0;padding:10px 16px;border-radius:8px;background:#15803d;color:#fff;text-decoration:none;font-weight:600}
  </style>
</head>
<body>
<main>
  <h1>Magic3D - fișiere pentru ofertă</h1>
  <p>Linkul expiră pe <?= $e($expira) ?>; după aceea fișierele se șterg automat.</p>
  <?php if (in_array('png', $meta['fisiere'], true)): ?>
    <p><img src="d.php?id=<?= $e($id) ?>&amp;f=png" alt="Captură a modelului"></p>
  <?php endif; ?>
  <p>
    <?php foreach (['3mf', 'stl'] as $t): if (in_array($t, $meta['fisiere'], true)): ?>
      <a class="btn" href="d.php?id=<?= $e($id) ?>&amp;f=<?= $t ?>">Descarcă <?= strtoupper($t) ?></a>
    <?php endif; endforeach; ?>
  </p>
</main>
</body>
</html>
