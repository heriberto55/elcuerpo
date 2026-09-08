<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
cms_start_session();
cms_require_login();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Metodo no permitido.']);
    exit;
}

if (!cms_verify_csrf($_POST['csrf_token'] ?? null)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'La sesion expiro. Vuelve a ingresar.']);
    exit;
}

$page = (string) ($_POST['page'] ?? '');
$html = (string) ($_POST['html'] ?? '');

if (!cms_is_allowed_page($page)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Pagina no permitida.']);
    exit;
}

if (trim($html) === '' || stripos($html, '<html') === false || stripos($html, '</html>') === false) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'El contenido recibido no parece una pagina HTML valida.']);
    exit;
}

$path = cms_page_path($page);
if (!is_writable($path)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'No se puede escribir esta pagina.']);
    exit;
}

if (!is_dir(CMS_BACKUP_DIR)) {
    mkdir(CMS_BACKUP_DIR, 0755, true);
}

$backupName = sprintf(
    '%s/%s-%s.bak.html',
    CMS_BACKUP_DIR,
    pathinfo($page, PATHINFO_FILENAME),
    date('Ymd-His')
);

copy($path, $backupName);

$bytes = file_put_contents($path, $html, LOCK_EX);
if ($bytes === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'No se pudieron guardar los cambios.']);
    exit;
}

echo json_encode(['ok' => true, 'message' => 'Cambios guardados.']);
