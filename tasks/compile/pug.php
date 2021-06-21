<?php

require_once __DIR__ . '/../../vendor/autoload.php';

$name = file_exists($argv[1] . DIRECTORY_SEPARATOR . 'template.pug') ? 'template' : 'index';

file_put_contents(
    getcwd() . DIRECTORY_SEPARATOR . $argv[2] . $name . '.php', 
    (new Pug(
        [
            'pretty' => true
        ]
    ))->compileFile(
        $name === 'template'
        ? getcwd() . DIRECTORY_SEPARATOR . $argv[1] . DIRECTORY_SEPARATOR . 'template.pug'
        : getcwd() . DIRECTORY_SEPARATOR . $argv[1] . DIRECTORY_SEPARATOR . 'index.pug'
    )
);