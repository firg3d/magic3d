<?php
/**
 * Magic3D - "Cere oferta de print": cod comun pentru upload.php, d.php si curata.php.
 *
 * Fisierele urcate stau IN AFARA radacinii publice (config: director_stocare) si se servesc doar
 * prin d.php, dupa un identificator aleatoriu de 32 de caractere hex. Nu exista listare.
 * Datele din formular (nume, telefon, oras...) NU ajung aici: pleaca doar in mesajul WhatsApp.
 */

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === '_comun.php') {
    http_response_code(404);
    exit;
}

/**
 * Configuratia. Valorile implicite de mai jos merg fara nimic altceva; ca sa le schimbi fara a
 * atinge acest fisier, copiaza config-oferta.example.php cu un nivel DEASUPRA radacinii publice,
 * ca config-magic3d-oferta.php, si pune acolo doar ce vrei altfel.
 */
function oferta_config(): array {
    static $config = null;
    if ($config !== null) return $config;
    $implicit = [
        // Unde stau fisierele. Implicit: langa public_html, nu in el.
        'director_stocare' => dirname(__DIR__, 2) . '/magic3d-oferte',
        // Dupa cate zile se sterg fisierele (si linkul nu mai merge).
        'expirare_zile' => 20,
        // Limite de marime, in MB.
        'max_mb_fisier' => 50,
        'max_mb_total' => 80,
        // Cate trimiteri pe ora de la aceeasi adresa IP (adresa nu se pastreaza, doar o amprenta).
        'trimiteri_pe_ora' => 10,
        // Gazdele acceptate pentru linkul de descarcare (protectie la Host header injection).
        'domenii_permise' => ['magic3d.ro', 'www.magic3d.ro', 'localhost'],
    ];
    $extern = dirname(__DIR__, 2) . '/config-magic3d-oferta.php';
    $config = is_file($extern) ? array_merge($implicit, (array) require $extern) : $implicit;
    return $config;
}

function oferta_raspunde(int $cod, array $date): void {
    http_response_code($cod);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($date, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function oferta_director(): string {
    $dir = rtrim(oferta_config()['director_stocare'], '/\\');
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) {
        error_log('Magic3D oferta: nu pot crea ' . $dir);
        oferta_raspunde(500, ['ok' => false, 'error' => 'stocare']);
    }
    // Plasa de siguranta daca directorul ajunge totusi intr-un loc public.
    $ht = $dir . '/.htaccess';
    if (!is_file($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\nOptions -Indexes\n");
    return $dir;
}

/** Identificatorul unei trimiteri: exact 32 de caractere hex, altfel nimic. */
function oferta_id_valid(?string $id): ?string {
    return (is_string($id) && preg_match('/^[a-f0-9]{32}$/', $id)) ? $id : null;
}

/** Sterge trimiterile mai vechi decat expirarea. Ruleaza la fiecare cerere (ieftin) si din curata.php. */
function oferta_curata(): int {
    $dir = oferta_director();
    $limita = time() - (int) oferta_config()['expirare_zile'] * 86400;
    $sterse = 0;
    foreach (glob($dir . '/*', GLOB_ONLYDIR) ?: [] as $sub) {
        if (!oferta_id_valid(basename($sub))) continue;
        $meta = @json_decode((string) @file_get_contents($sub . '/meta.json'), true);
        $creat = is_array($meta) && isset($meta['creat']) ? (int) $meta['creat'] : (int) @filemtime($sub);
        if ($creat >= $limita) continue;
        foreach (glob($sub . '/*') ?: [] as $f) @unlink($f);
        @rmdir($sub);
        $sterse++;
    }
    // Contoarele de trimiteri mai vechi de o ora nu mai servesc la nimic.
    foreach (glob($dir . '/rata-*.json') ?: [] as $f) {
        if (@filemtime($f) < time() - 3600) @unlink($f);
    }
    return $sterse;
}

function oferta_baza_url(): string {
    $gazda = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    $permise = oferta_config()['domenii_permise'];
    if (!in_array($gazda, $permise, true)) $gazda = $permise[0];
    $port = (isset($_SERVER['SERVER_PORT']) && $gazda === 'localhost') ? ':' . $_SERVER['SERVER_PORT'] : '';
    $schema = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $gazda !== 'localhost' ? 'https' : 'http';
    return $schema . '://' . $gazda . $port . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/oferta/x.php'), '/') . '/';
}
