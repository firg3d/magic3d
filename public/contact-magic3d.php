<?php
/**
 * Magic3D — formular de contact și contribuții.
 * Primește: raportări de probleme, propuneri de tematici, idei de generatoare noi,
 * întrebări despre licență și contribuții generale.
 *
 * Necesită PHP activ. Configurarea (chei, destinatar) stă în ../config-magic3d.php,
 * ÎN AFARA rădăcinii publice — nu în acest fișier.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function raspunde(int $cod, array $date): void {
    http_response_code($cod);
    echo json_encode($date, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    raspunde(405, ['ok' => false, 'error' => 'Metodă invalidă.']);
}

// ─────────────────────────────────────────────────────────
// Configurare externă
// ─────────────────────────────────────────────────────────
// config-magic3d.php stă cu un nivel deasupra rădăcinii publice și returnează:
//   return [
//     'recaptcha_secret' => '...',      // cheia NOUĂ, după rotire
//     'destinatar'       => 'contact@firg3d.com',
//     'domenii_permise'  => ['magic3d.ro', 'www.magic3d.ro'],
//   ];
$caleConfig = __DIR__ . '/../config-magic3d.php';
if (!is_file($caleConfig)) {
    error_log('Magic3D contact: lipseste config-magic3d.php');
    raspunde(500, ['ok' => false, 'error' => 'Formularul nu este configurat. Scrie-ne direct pe contact@firg3d.com.']);
}
$config = require $caleConfig;

$SECRET      = $config['recaptcha_secret'] ?? '';
$DESTINATAR  = $config['destinatar'] ?? 'contact@firg3d.com';
$DOMENII_OK  = $config['domenii_permise'] ?? ['magic3d.ro', 'www.magic3d.ro'];

// ─────────────────────────────────────────────────────────
// Validarea gazdei — previne host header injection în linkurile din email
// ─────────────────────────────────────────────────────────
$gazdaBruta = strtolower($_SERVER['HTTP_HOST'] ?? '');
$gazdaBruta = preg_replace('/:\d+$/', '', $gazdaBruta);
if (!in_array($gazdaBruta, $DOMENII_OK, true)) {
    $gazdaBruta = $DOMENII_OK[0];
}
$domeniu = preg_replace('/^www\./', '', $gazdaBruta);
$schema  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';

// ─────────────────────────────────────────────────────────
// Capcană anti-spam
// ─────────────────────────────────────────────────────────
if (!empty($_POST['website'])) {
    raspunde(200, ['ok' => true]);
}

// ─────────────────────────────────────────────────────────
// Limitare de rată — 5 trimiteri pe oră de la același IP
// ─────────────────────────────────────────────────────────
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$dirRata = sys_get_temp_dir() . '/magic3d-rata';
if (!is_dir($dirRata)) { @mkdir($dirRata, 0700, true); }
$fisierRata = $dirRata . '/' . hash('sha256', $ip) . '.txt';

$acum = time();
$marcaje = is_file($fisierRata)
    ? array_filter(array_map('intval', explode("\n", (string) @file_get_contents($fisierRata))))
    : [];
$marcaje = array_values(array_filter($marcaje, fn($t) => $t > $acum - 3600));

if (count($marcaje) >= 5) {
    raspunde(429, ['ok' => false, 'error' => 'Ai trimis prea multe mesaje. Încearcă peste o oră sau scrie direct pe contact@firg3d.com.']);
}

// ─────────────────────────────────────────────────────────
// reCAPTCHA
// ─────────────────────────────────────────────────────────
$token = $_POST['g-recaptcha-response'] ?? '';
if ($token === '') {
    raspunde(422, ['ok' => false, 'error' => 'Te rugăm să bifezi căsuța „Nu sunt robot".']);
}

$dateVerificare = http_build_query([
    'secret'   => $SECRET,
    'response' => $token,
    'remoteip' => $ip,
]);
$raspunsVerificare = false;

if (function_exists('curl_init')) {
    $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $dateVerificare,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $raspunsVerificare = curl_exec($ch);
    curl_close($ch);
} else {
    $context = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => $dateVerificare,
        'timeout' => 10,
    ]]);
    $raspunsVerificare = @file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, $context);
}

$captchaOk = false;
if ($raspunsVerificare) {
    $rezultat = json_decode($raspunsVerificare, true);
    $captchaOk = !empty($rezultat['success']);
}
if (!$captchaOk) {
    raspunde(422, ['ok' => false, 'error' => 'Verificarea „Nu sunt robot" a eșuat. Reîncearcă, te rugăm.']);
}

// ─────────────────────────────────────────────────────────
// Câmpurile formularului
// ─────────────────────────────────────────────────────────
function curata(string $cheie, int $max = 2000): string {
    $v = trim(strip_tags($_POST[$cheie] ?? ''));
    return mb_substr($v, 0, $max);
}

$CATEGORII = [
    'problema'   => 'Raportare problemă',
    'tematica'   => 'Propunere tematică nouă',
    'generator'  => 'Idee de generator nou',
    'baza'       => 'Propunere bază / postament',
    'licenta'    => 'Întrebare despre licență',
    'altele'     => 'Altceva',
];

$APLICATII = [
    'litere-decor', 'nume-3d', 'brelocuri', 'litere-fagure',
    'cutii-litere', 'cuvinte-decor', 'litere-led',
    'brelocuri-articulate', 'placute-etichete',
    'platforma', 'nu-se-aplica',
];

$categorie = $_POST['categorie'] ?? '';
if (!array_key_exists($categorie, $CATEGORII)) {
    raspunde(422, ['ok' => false, 'error' => 'Alege tipul mesajului.']);
}

$aplicatie = $_POST['aplicatie'] ?? 'nu-se-aplica';
if (!in_array($aplicatie, $APLICATII, true)) {
    $aplicatie = 'nu-se-aplica';
}

$nume       = curata('nume', 120);
$email      = trim($_POST['email'] ?? '');
$mesaj      = curata('mesaj', 8000);
$diagnostic = curata('diagnostic', 4000);
$limba      = ($_POST['limba'] ?? 'ro') === 'en' ? 'en' : 'ro';

if ($nume === '' || $email === '' || $mesaj === '') {
    raspunde(422, ['ok' => false, 'error' => 'Completează numele, emailul și mesajul.']);
}
if (mb_strlen($mesaj) < 20) {
    raspunde(422, ['ok' => false, 'error' => 'Descrie puțin mai detaliat — cel puțin câteva propoziții ne ajută mult.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    raspunde(422, ['ok' => false, 'error' => 'Adresa de email nu este validă.']);
}

// ─────────────────────────────────────────────────────────
// Fișiere atașate — până la 4
// ─────────────────────────────────────────────────────────
$EXT_OK    = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'stl', '3mf', 'obj', 'zip', 'pdf'];
$MIME_OK   = [
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/zip', 'application/pdf', 'application/octet-stream',
    'model/stl', 'model/3mf', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
];
$MAX_BYTES = 15 * 1024 * 1024;
$MAX_FISIERE = 4;

$dirUpload = __DIR__ . '/incarcari/';
$liniiFisiere = [];

if (!empty($_FILES['fisiere']['name'][0])) {
    if (!is_dir($dirUpload)) { @mkdir($dirUpload, 0755, true); }

    // Blochează execuția în directorul de încărcări.
    $htaccess = $dirUpload . '.htaccess';
    if (!is_file($htaccess)) {
        @file_put_contents($htaccess, implode("\n", [
            'php_flag engine off',
            'RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phps',
            'RemoveType .php .phtml .php3 .php4 .php5 .php7 .php8 .phps',
            '<IfModule mod_headers.c>',
            '  Header set X-Content-Type-Options "nosniff"',
            '  Header set Content-Disposition "attachment"',
            '</IfModule>',
        ]));
    }

    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
    $numar = count($_FILES['fisiere']['name']);

    if ($numar > $MAX_FISIERE) {
        raspunde(422, ['ok' => false, 'error' => 'Poți atașa cel mult 4 fișiere.']);
    }

    for ($i = 0; $i < $numar; $i++) {
        if ($_FILES['fisiere']['error'][$i] === UPLOAD_ERR_NO_FILE) { continue; }
        if ($_FILES['fisiere']['error'][$i] !== UPLOAD_ERR_OK) {
            raspunde(422, ['ok' => false, 'error' => 'Un fișier nu a putut fi încărcat. Verifică mărimea și reîncearcă.']);
        }
        if ($_FILES['fisiere']['size'][$i] > $MAX_BYTES) {
            raspunde(422, ['ok' => false, 'error' => 'Fiecare fișier trebuie să fie sub 15MB. Pentru fișiere mari, trimite un link în mesaj.']);
        }

        $numeOriginal = $_FILES['fisiere']['name'][$i];
        $ext = strtolower(pathinfo($numeOriginal, PATHINFO_EXTENSION));
        if (!in_array($ext, $EXT_OK, true)) {
            raspunde(422, ['ok' => false, 'error' => 'Tip de fișier neacceptat. Folosește imagini, .STL, .3MF, .OBJ, .ZIP sau .PDF.']);
        }

        if ($finfo) {
            $mime = finfo_file($finfo, $_FILES['fisiere']['tmp_name'][$i]);
            if (!in_array($mime, $MIME_OK, true)) {
                raspunde(422, ['ok' => false, 'error' => 'Conținutul unui fișier nu corespunde extensiei lui.']);
            }
        }

        $numeSigur = bin2hex(random_bytes(8)) . '.' . $ext;
        $destinatie = $dirUpload . $numeSigur;

        if (move_uploaded_file($_FILES['fisiere']['tmp_name'][$i], $destinatie)) {
            @chmod($destinatie, 0644);
            $url = $schema . '://' . $gazdaBruta . '/incarcari/' . rawurlencode($numeSigur);
            $liniiFisiere[] = "  $url   (original: $numeOriginal)";
        }
    }
    if ($finfo) { finfo_close($finfo); }

    // Curățare: șterge încărcările mai vechi de 30 de zile.
    foreach (glob($dirUpload . '*') ?: [] as $vechi) {
        if (basename($vechi) === '.htaccess') { continue; }
        if (is_file($vechi) && filemtime($vechi) < $acum - 2592000) { @unlink($vechi); }
    }
}

// ─────────────────────────────────────────────────────────
// Email
// ─────────────────────────────────────────────────────────
$subiect = '[Magic3D] ' . $CATEGORII[$categorie] . ' — ' . $aplicatie;

$corp  = "Mesaj nou prin formularul Magic3D ($domeniu)\n";
$corp .= str_repeat('─', 55) . "\n\n";
$corp .= "Tip:       " . $CATEGORII[$categorie] . "\n";
$corp .= "Aplicație: $aplicatie\n";
$corp .= "Limbă:     $limba\n\n";
$corp .= "Nume:      $nume\n";
$corp .= "Email:     $email\n\n";
$corp .= "Mesaj:\n$mesaj\n\n";

if ($diagnostic !== '') {
    $corp .= str_repeat('─', 55) . "\n";
    $corp .= "Diagnostic trimis de aplicație:\n$diagnostic\n\n";
}

$corp .= str_repeat('─', 55) . "\n";
$corp .= $liniiFisiere
    ? "Fișiere atașate:\n" . implode("\n", $liniiFisiere) . "\n\n"
    : "Fișiere atașate: -\n\n";
$corp .= "Trimis la " . date('d.m.Y H:i') . "\n";
$corp .= "Linkurile către fișiere expiră după 30 de zile.\n";

$expeditor = 'formular@' . $domeniu;
$antete = [
    'From: Magic3D <' . $expeditor . '>',
    'Reply-To: ' . preg_replace('/[\r\n]+/', '', $email),
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: Magic3D',
];

$trimis = @mail($DESTINATAR, $subiect, $corp, implode("\r\n", $antete), '-f' . $expeditor);

if ($trimis) {
    $marcaje[] = $acum;
    @file_put_contents($fisierRata, implode("\n", $marcaje), LOCK_EX);
    raspunde(200, ['ok' => true]);
}

error_log('Magic3D contact: mail() a esuat pentru ' . $email);
raspunde(500, [
    'ok' => false,
    'error' => 'Nu am putut trimite mesajul automat. Scrie-ne direct pe contact@firg3d.com.',
]);
