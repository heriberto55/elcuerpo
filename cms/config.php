<?php
declare(strict_types=1);

define('CMS_ADMIN_USER', getenv('CMS_ADMIN_USER') ?: 'admin');
define('CMS_ADMIN_PASSWORD_HASH', getenv('CMS_ADMIN_PASSWORD_HASH') ?: '$2y$10$7C1CmkoZt2rQVcCxZZPMc.WgyU.HLJXexfp4odin1gBlOHSWeDe4y');
const CMS_ROOT = __DIR__ . '/..';
define('CMS_DATA_DIR', getenv('CMS_DATA_DIR') ?: CMS_ROOT . '/data');
define('CMS_BACKUP_DIR', CMS_DATA_DIR . '/backups');
define('CMS_SESSION_DIR', CMS_DATA_DIR . '/sessions');
define('CMS_UPLOAD_DIR', CMS_DATA_DIR . '/uploads/cms');
const CMS_UPLOAD_URL = 'uploads/cms';

function cms_start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        if (!is_dir(CMS_SESSION_DIR)) {
            mkdir(CMS_SESSION_DIR, 0700, true);
        }
        session_save_path(CMS_SESSION_DIR);
        session_name('elcuerpo_cms');
        session_start();
    }
}

function cms_is_logged_in(): bool
{
    return isset($_SESSION['cms_user']) && $_SESSION['cms_user'] === CMS_ADMIN_USER;
}

function cms_require_login(): void
{
    if (!cms_is_logged_in()) {
        header('Location: index.php');
        exit;
    }
}

function cms_csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function cms_verify_csrf(?string $token): bool
{
    return is_string($token)
        && isset($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $token);
}

function cms_pages(): array
{
    $pages = [];
    foreach (scandir(CMS_ROOT) ?: [] as $file) {
        if (preg_match('/^[a-zA-Z0-9_-]+\.html$/', $file) && is_file(CMS_ROOT . '/' . $file)) {
            $pages[] = $file;
        }
    }

    sort($pages, SORT_NATURAL | SORT_FLAG_CASE);

    return $pages;
}

function cms_is_allowed_page(string $page): bool
{
    return in_array($page, cms_pages(), true);
}

function cms_page_path(string $page): string
{
    return CMS_ROOT . '/' . $page;
}

function cms_page_title(string $page): string
{
    $html = file_get_contents(cms_page_path($page));
    if (is_string($html) && preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
        $title = trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES, 'UTF-8'));
        if ($title !== '') {
            return $title;
        }
    }

    return $page;
}

function cms_slug(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?: 'archivo';
    $value = trim($value, '-');

    return $value !== '' ? $value : 'archivo';
}
