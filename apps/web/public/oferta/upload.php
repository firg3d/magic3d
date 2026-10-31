<?php
/**
 * Magic3D - primeste fisierele unei cereri de oferta (3MF, STL, captura PNG) si intoarce linkul
 * de descarcare pe care editorul il pune in mesajul WhatsApp.
 *
 * POST multipart, campul "fisiere[]". Doar .3mf, .stl, .png, verificate si dupa continut, nu doar
 * dupa extensie. Raspuns: {"ok":true,"link":"https://.../d.php?id=...","expiraZile":20,"expira":"2026-11-20"}
 */

require __DIR__ . '/_comun.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    oferta_raspunde(405, ['ok' => false, 'error' => 'metoda']);
}

$config = oferta_config();
$dir = oferta_director();
oferta_curata();

// Limita pe ora, dupa o amprenta a adresei IP (adresa insasi nu se scrie nicaieri).
$amprenta = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . __FILE__ . '|' . date('YmdH')), 0, 24);
$rata = $dir . '/rata-' . $amprenta . '.json';
$numar = is_file($rata) ? (int) @file_get_contents($rata) : 0;
if ($numar >= (int) $config['trimiteri_pe_ora']) {
    oferta_raspunde(429, ['ok' => false, 'error' => 'prea-multe']);
}

$intrare = $_FILES['fisiere'] ?? null;
if (!$intrare || !is_array($intrare['name'] ?? null)) {
    oferta_raspunde(400, ['ok' => false, 'error' => 'fara-fisiere']);
}

/** Verifica dupa primii octeti ca fisierul e ce spune extensia. */
function tip_real(string $cale, string $ext): bool {
    $f = @fopen($cale, 'rb');
    if (!$f) return false;
    $cap = (string) fread($f, 84);
    fclose($f);
    $marime = filesize($cale);
    switch ($ext) {
        case 'png':
            return strncmp($cap, "\x89PNG\r\n\x1a\n", 8) === 0;
        case '3mf':
            return strncmp($cap, "PK\x03\x04", 4) === 0;
        case 'stl':
            if (stripos(ltrim($cap), 'solid') === 0) return true; // STL text
            if ($marime < 84) return false;
            $triunghiuri = unpack('V', substr($cap, 80, 4))[1];
            return 84 + 50 * $triunghiuri === $marime; // STL binar
    }
    return false;
}

$maxFisier = (int) $config['max_mb_fisier'] * 1024 * 1024;
$maxTotal = (int) $config['max_mb_total'] * 1024 * 1024;
$acceptate = [];
$total = 0;
foreach ($intrare['name'] as $i => $nume) {
    if (($intrare['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        oferta_raspunde(400, ['ok' => false, 'error' => 'upload']);
    }
    $ext = strtolower(pathinfo((string) $nume, PATHINFO_EXTENSION));
    if (!in_array($ext, ['3mf', 'stl', 'png'], true)) {
        oferta_raspunde(415, ['ok' => false, 'error' => 'tip']);
    }
    $marime = (int) $intrare['size'][$i];
    $total += $marime;
    if ($marime <= 0 || $marime > $maxFisier || $total > $maxTotal) {
        oferta_raspunde(413, ['ok' => false, 'error' => 'prea-mare', 'maxMb' => (int) $config['max_mb_fisier']]);
    }
    $tmp = $intrare['tmp_name'][$i];
    if (!is_uploaded_file($tmp) || !tip_real($tmp, $ext)) {
        oferta_raspunde(415, ['ok' => false, 'error' => 'continut']);
    }
    if (isset($acceptate[$ext])) {
        oferta_raspunde(400, ['ok' => false, 'error' => 'duplicat']);
    }
    $acceptate[$ext] = $tmp;
}
if (!$acceptate) {
    oferta_raspunde(400, ['ok' => false, 'error' => 'fara-fisiere']);
}

$id = bin2hex(random_bytes(16));
$sub = $dir . '/' . $id;
if (!@mkdir($sub, 0750)) {
    oferta_raspunde(500, ['ok' => false, 'error' => 'stocare']);
}
foreach ($acceptate as $ext => $tmp) {
    // Nume aleatoriu si pe disc: numele trimis de browser nu se foloseste nicaieri.
    if (!move_uploaded_file($tmp, $sub . '/model.' . $ext)) {
        oferta_raspunde(500, ['ok' => false, 'error' => 'stocare']);
    }
}
$creat = time();
file_put_contents($sub . '/meta.json', json_encode(['creat' => $creat, 'fisiere' => array_keys($acceptate)]));
file_put_contents($rata, (string) ($numar + 1));

$zile = (int) $config['expirare_zile'];
oferta_raspunde(200, [
    'ok' => true,
    'link' => oferta_baza_url() . 'd.php?id=' . $id,
    'expiraZile' => $zile,
    'expira' => date('Y-m-d', $creat + $zile * 86400),
]);
