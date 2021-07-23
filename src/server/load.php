<?php 

require_once __DIR__ . '/../../vendor/autoload.php';

$app = json_decode(file_get_contents($_SERVER['DOCUMENT_ROOT'] . DIRECTORY_SEPARATOR . 'app.json'), true);
define('APP', $app);
define('DATASOURCE', $app['datasource']);
define('UNITS', $app['units']);
define('ROUTES', $app['routes']);