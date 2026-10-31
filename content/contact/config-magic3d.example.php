<?php
/**
 * EXEMPLU de configurare pentru formularul de contact.
 *
 * Se copiaza CU UN NIVEL DEASUPRA radacinii publice si se redenumeste `config-magic3d.php`:
 *
 *   /home/utilizator/config-magic3d.php     <- aici
 *   /home/utilizator/public_html/           <- radacina publica (index.html, contact-magic3d.php)
 *
 * Fisierul real e in .gitignore si NU intra niciodata in depozit: contine cheia secreta.
 */
return [
    // cheia SECRETA reCAPTCHA v2, din consola Google. Cea din vechiul contact.php a fost
    // expusa in fisier public — roteste-o din consola inainte de a o pune aici.
    'recaptcha_secret' => 'PUNE_AICI_CHEIA_SECRETA',

    // unde ajung mesajele
    'destinatar'       => 'contact@firg3d.com',

    // domeniile de pe care se accepta trimiteri; primul e si cel folosit in linkurile din email
    'domenii_permise'  => ['magic3d.ro', 'www.magic3d.ro'],
];
