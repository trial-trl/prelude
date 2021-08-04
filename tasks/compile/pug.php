<?php

require_once __DIR__ . '/../../vendor/autoload.php';

foreach (glob($argv[1] . DIRECTORY_SEPARATOR . '*.pug') as $pug) {
    file_put_contents(
        $argv[2] . pathinfo($pug, PATHINFO_FILENAME) . '.php',
        (new Pug(
            [
                'pretty' => true
            ]
        ))->compileFile($pug)
    );
}