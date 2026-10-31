<?php
/**
 * Magic3D — primeste rapoarte de problema si propuneri din aplicatie.
 *
 * Se pune in public_html, langa index.html, pe acelasi domeniu cu aplicatia. Fiind acelasi
 * domeniu, nu e nevoie de niciun header CORS: cererea nu e „cross-origin". Daca il muti pe alt
 * domeniu, trebuie adaugat `Access-Control-Allow-Origin`, altfel browserul blocheaza cererea
 * si utilizatorul vede doar un esec fara explicatie.
 *
 * Construit dupa contact.php de pe firg3d.com, cu doua diferente:
 *   · fara reCAPTCHA. Formularul nu e public pe o pagina indexata, ci se deschide din
 *     aplicatie; iar reCAPTCHA ar insemna un apel catre Google la fiecare raport, adica exact
 *     ce promitem ca nu facem. In loc, capcana ascunsa + limitare pe IP.
 *   · primeste un BLOC DE DIAGNOSTIC si presetul, atasate ca fisier. Fara ele, „nu merge" nu
 *     poate fi reprodus; cu presetul, se deschide in aplicatie si se vede exact ce vedea omul.
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Metodă invalidă.']);
    exit;
}

// Capcană anti-spam: câmpul e ascuns în interfață și trebuie să rămână gol.
if (!empty($_POST['website'])) { echo json_encode(['ok' => true]); exit; }

// --- Limitare simplă pe IP: cel mult 5 rapoarte pe oră ---
// Fără ea, adresa e un formular de mail deschis. Fișierele vechi se curăță singure.
$ip = preg_replace('/[^a-zA-Z0-9]/', '', $_SERVER['REMOTE_ADDR'] ?? 'necunoscut');
$dirLimita = sys_get_temp_dir() . '/magic3d-limita';
if (!is_dir($dirLimita)) { @mkdir($dirLimita, 0700, true); }
$fisierLimita = "$dirLimita/$ip";
$acum = time();
$urme = is_file($fisierLimita) ? array_filter(explode(',', (string)@file_get_contents($fisierLimita))) : [];
$urme = array_values(array_filter($urme, fn($t) => $acum - (int)$t < 3600));
if (count($urme) >= 5) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Prea multe rapoarte trimise într-o oră. Încearcă mai târziu.']);
    exit;
}
$urme[] = $acum;
@file_put_contents($fisierLimita, implode(',', $urme));

// --- Datele din formular ---
$email   = trim($_POST['email'] ?? '');
$mesaj   = trim(strip_tags($_POST['mesaj'] ?? ''));
$fel     = trim(strip_tags($_POST['fel'] ?? 'problema'));   // problema | propunere
$aplicatie = mb_substr(trim(strip_tags($_POST['aplicatie'] ?? '-')), 0, 40);
$licenta   = mb_substr(trim(strip_tags($_POST['licenta'] ?? '-')), 0, 60);

if ($mesaj === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Scrie te rog ce s-a întâmplat.']);
    exit;
}
// Emailul e OPȚIONAL — dar dacă e dat, trebuie să fie valid, altfel nu putem răspunde.
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Adresa de email nu este validă.']);
    exit;
}

// Diagnosticul NU trece prin strip_tags: e JSON, iar curățarea de etichete l-ar putea ciunti.
// E oricum inclus doar în corpul mailului, niciodată redat ca HTML.
$diagnostic = (string)($_POST['diagnostic'] ?? '');
if (strlen($diagnostic) > 200000) { $diagnostic = substr($diagnostic, 0, 200000) . "\n[...tăiat]"; }

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$rawHost = $_SERVER['HTTP_HOST'] ?? 'magic3d.ro';
$domeniu = preg_replace('/[^a-z0-9\.\-]/', '', strtolower(preg_replace('/^www\./', '', $rawHost)));
if ($domeniu === '') { $domeniu = 'magic3d.ro'; }

// --- Presetul, salvat ca fișier ca să poată fi deschis înapoi în aplicație ---
$linieFisier = "Preset atașat: -\n";
if (isset($_FILES['preset']) && $_FILES['preset']['error'] === UPLOAD_ERR_OK && $_FILES['preset']['size'] <= 2 * 1024 * 1024) {
    $dir = __DIR__ . '/rapoarte/';
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
    $numeFisier = date('Ymd-His') . '_' . bin2hex(random_bytes(4)) . '.json';
    if (move_uploaded_file($_FILES['preset']['tmp_name'], $dir . $numeFisier)) {
        $linieFisier = "Preset atașat: $scheme://$rawHost/rapoarte/$numeFisier\n"
                     . "(se încarcă în aplicație din Preseturi, ca să vezi exact ce vedea el)\n";
    } else {
        $linieFisier = "Preset atașat: - (nu a putut fi salvat)\n";
    }
}

$to      = 'contact@firg3d.com';
$subject = ($fel === 'propunere' ? 'Propunere' : 'Problemă') . " Magic3D — $aplicatie";

$body  = "Raport trimis din aplicația Magic3D ($domeniu)\n";
$body .= "---------------------------------------------------\n\n";
$body .= "Fel:       " . ($fel === 'propunere' ? 'propunere / îmbunătățire' : 'defect') . "\n";
$body .= "Aplicație: $aplicatie\n";
$body .= "Licență:   $licenta\n";
$body .= "Email:     " . ($email !== '' ? $email : '- (nu a lăsat adresă)') . "\n\n";
$body .= "Mesaj:\n$mesaj\n\n";
$body .= $linieFisier . "\n";
$body .= "---------------------------------------------------\n";
$body .= "DIAGNOSTIC\n";
$body .= "---------------------------------------------------\n";
$body .= $diagnostic . "\n\n";
$body .= "Trimis la " . date('d.m.Y H:i');

// „From" de pe domeniul care rulează scriptul: altfel multe servere marchează mesajul ca spam.
$fromEmail = 'formular@' . $domeniu;
$headers = [
    'From: Magic3D <' . $fromEmail . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];
// Reply-To doar dacă avem o adresă validă — altfel headerul e invalid și mailul poate fi respins.
if ($email !== '') { $headers[] = 'Reply-To: ' . preg_replace('/[\r\n]+/', '', $email); }

if (@mail($to, $subject, $body, implode("\r\n", $headers), '-f' . $fromEmail)) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Nu am putut trimite raportul. Scrie te rog direct pe contact@firg3d.com.']);
}
