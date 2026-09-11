<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
cms_start_session();

$error = '';

if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: index.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $user = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if ($user === CMS_ADMIN_USER && password_verify($password, CMS_ADMIN_PASSWORD_HASH)) {
        session_regenerate_id(true);
        $_SESSION['cms_user'] = CMS_ADMIN_USER;
        cms_csrf_token();
        header('Location: index.php');
        exit;
    }

    $error = 'Usuario o contraseña incorrectos.';
}

$loggedIn = cms_is_logged_in();
$pages = $loggedIn ? cms_pages() : [];
$selectedPage = (string) ($_GET['page'] ?? 'index.html');
if ($loggedIn && !cms_is_allowed_page($selectedPage)) {
    $selectedPage = $pages[0] ?? '';
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CMS El Cuerpo</title>
  <link rel="stylesheet" href="assets/cms.css">
</head>
<body>
<?php if (!$loggedIn): ?>
  <main class="login-shell">
    <section class="login-card">
      <p class="eyebrow">Panel de administración</p>
      <h1>CMS El Cuerpo</h1>
      <form method="post" class="login-form">
        <?php if ($error !== ''): ?>
          <div class="alert"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
        <?php endif; ?>
        <label>
          Usuario
          <input type="text" name="username" autocomplete="username" required autofocus>
        </label>
        <label>
          Contraseña
          <input type="password" name="password" autocomplete="current-password" required>
        </label>
        <button type="submit" name="login" value="1">Ingresar</button>
      </form>
    </section>
  </main>
<?php else: ?>
  <div class="cms-app sidebar-collapsed" data-page="<?php echo htmlspecialchars($selectedPage, ENT_QUOTES, 'UTF-8'); ?>">
    <button id="toggleSidebar" class="sidebar-toggle" type="button" aria-label="Abrir menu de paginas" aria-expanded="false">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <aside class="sidebar">
      <button id="closeSidebar" class="sidebar-close" type="button" aria-label="Cerrar menu">Cerrar</button>
      <div>
        <p class="eyebrow">CMS</p>
        <h1>El Cuerpo</h1>
      </div>
      <nav class="page-list" aria-label="Paginas del sitio">
        <?php foreach ($pages as $page): ?>
          <a class="<?php echo $page === $selectedPage ? 'active' : ''; ?>" href="?page=<?php echo urlencode($page); ?>">
            <span><?php echo htmlspecialchars(cms_page_title($page), ENT_QUOTES, 'UTF-8'); ?></span>
            <small><?php echo htmlspecialchars($page, ENT_QUOTES, 'UTF-8'); ?></small>
          </a>
        <?php endforeach; ?>
      </nav>
      <a class="logout" href="?logout=1">Cerrar sesión</a>
    </aside>

    <main class="workspace">
      <header class="toolbar">
        <div>
          <p class="eyebrow">Pagina actual</p>
          <h2><?php echo htmlspecialchars($selectedPage, ENT_QUOTES, 'UTF-8'); ?></h2>
        </div>
        <div class="actions">
          <span id="saveStatus" class="status" aria-live="polite"></span>
          <button id="editPage" type="button">Editar página</button>
          <button id="savePage" type="button" class="primary" disabled>Guardar cambios</button>
          <button id="cancelEdit" type="button" class="ghost" disabled>Cancelar</button>
        </div>
      </header>

      <div id="mediaTools" class="context-menu" hidden>
        <div id="insertMenu" class="context-section">
          <strong>Agregar contenido</strong>
          <button id="insertImage" type="button">Nueva imagen</button>
          <button id="insertVideo" type="button">Nuevo video</button>
          <button id="insertYoutube" type="button">Video YouTube</button>
        </div>
        <div id="selectedMenu" class="context-section">
          <span id="selectedMediaLabel">Selecciona una imagen o video</span>
          <button id="replaceMedia" type="button" disabled>Reemplazar</button>
          <button id="replaceIframe" type="button" disabled>Reemplazar iframe</button>
          <button id="changeYoutube" type="button" disabled>Cambiar link YouTube</button>
          <button id="moveMediaUp" type="button" disabled>Mover arriba</button>
          <button id="moveMediaDown" type="button" disabled>Mover abajo</button>
          <button id="deleteMedia" type="button" class="danger" disabled>Eliminar</button>
        </div>
        <div id="linkMenu" class="context-section" hidden>
          <strong>Editar enlace</strong>
          <label>
            Nombre del enlace
            <input id="linkText" type="text" placeholder="Texto visible">
          </label>
          <label>
            URL
            <input id="linkUrl" type="text" placeholder="https://ejemplo.com">
          </label>
          <button id="applyLink" type="button" class="primary">Guardar enlace</button>
        </div>
      </div>
      <input id="imageUpload" type="file" accept="image/*" hidden>
      <input id="videoUpload" type="file" accept="video/*" hidden>
      <input id="replaceUpload" type="file" accept="image/*,video/*" hidden>

      <section class="preview-wrap">
        <iframe
          id="pagePreview"
          title="Vista previa editable"
          src="../<?php echo rawurlencode($selectedPage); ?>?cms_preview=<?php echo time(); ?>"></iframe>
      </section>
    </main>
  </div>
  <script>
    window.CMS_CONFIG = {
      page: <?php echo json_encode($selectedPage); ?>,
      csrfToken: <?php echo json_encode(cms_csrf_token()); ?>
    };
  </script>
  <script src="assets/cms.js"></script>
<?php endif; ?>
</body>
</html>
