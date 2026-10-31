<?php
/**
 * Exemplu de configuratie pentru "Cere oferta de print". Optional.
 *
 * Copiaza fisierul cu un nivel DEASUPRA radacinii publice si redenumeste-l:
 *   /home/<utilizator>/config-magic3d-oferta.php     <- aici
 *   /home/<utilizator>/public_html/                  <- radacina publica
 * Pune doar cheile pe care vrei sa le schimbi; restul raman cele din _comun.php.
 */
return [
    'expirare_zile' => 20,
    'max_mb_fisier' => 50,
    'max_mb_total' => 80,
    'trimiteri_pe_ora' => 10,
    // 'director_stocare' => '/home/<utilizator>/magic3d-oferte',
];
