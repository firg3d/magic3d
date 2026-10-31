<?php
/**
 * Magic3D - sterge cererile de oferta expirate. Pentru cron-ul din cPanel, o data pe zi:
 *
 *   php /home/<utilizator>/public_html/oferta/curata.php
 *
 * Nu e obligatoriu: upload.php si d.php curata si ele la fiecare cerere. Cron-ul garanteaza
 * stergerea si in zilele in care nu trimite nimeni nimic. Din browser nu raspunde.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/_comun.php';
echo 'Sterse: ' . oferta_curata() . PHP_EOL;
