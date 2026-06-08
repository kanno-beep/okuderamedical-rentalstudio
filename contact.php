<?php
/**
 * オクデラメディカル 貸しスタジオ - お問い合わせフォーム送信処理
 *
 * このファイルを HTML/JS と同じディレクトリへアップロードしてください。
 * PHP 7.0 以降推奨。レンタルサーバーの mail 機能が有効である必要があります。
 *
 * 設定値は下記「設定セクション」を環境に合わせて変更してください。
 */

// ============================================================
// 設定（環境に合わせて変更してください）
// ============================================================

// 受信先メールアドレス（オクデラ様のメール）
$SHOP_EMAIL = 'okudera@carrot.ocn.ne.jp';

// 送信元アドレス
//   ※ 多くのレンタルサーバーでは、From にサーバードメイン以外を
//     指定するとスパム判定されたり拒否されたりします。
//     サーバーで実際に使えるアドレスに必ず変更してください。
//   例： noreply@okuderamedical.co.jp / info@okuderamedical.co.jp
$FROM_EMAIL = 'okudera@carrot.ocn.ne.jp';
$FROM_NAME  = 'オクデラメディカル 貸しスタジオ';

// 受信メールの件名
$SHOP_SUBJECT = '【貸しスタジオ】Webサイトから新しいお問い合わせがありました';

// 自動返信メールの件名
$AUTO_SUBJECT = '【貸しスタジオ】お問い合わせ受付のご連絡（オクデラメディカル）';

// 許可するオリジン（CORS）。空配列なら同一オリジンのみ
$ALLOWED_ORIGINS = [
    // 開発時の確認用に GitHub Pages を許可
    'https://kanno-beep.github.io',
];

// ============================================================
// ここから下は通常変更不要
// ============================================================

mb_language('Japanese');
mb_internal_encoding('UTF-8');
header('Content-Type: application/json; charset=utf-8');

// CORS: 必要なオリジンだけ許可
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// JSON または form-data 両対応
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

// 入力取得＋安全化
$pick = function ($key) use ($data) {
    $v = $data[$key] ?? '';
    if (!is_string($v)) $v = '';
    $v = trim($v);
    // 改行を含むヘッダーインジェクション対策
    $v = preg_replace('/[\r\n]+/u', ' ', $v);
    return $v;
};

$name     = $pick('name');
$phone    = $pick('phone');
$email    = $pick('email');
$usage    = $pick('usage');
$duration = $pick('duration');
$date     = $pick('date');
$message  = $data['message'] ?? '';
if (!is_string($message)) $message = '';
$message  = trim($message);

// 必須チェック
$missing = [];
if ($name === '')     $missing[] = 'お名前';
if ($phone === '')    $missing[] = '電話番号';
if ($usage === '')    $missing[] = 'ご利用目的';
if ($duration === '') $missing[] = 'ご利用時間';
if ($date === '')     $missing[] = 'ご希望日時';

if ($missing) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => '必須項目が未入力です：' . implode('、', $missing),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 電話番号形式チェック
if (!preg_match('/^[\d\-\+\(\)\s]{7,15}$/', $phone)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => '電話番号の形式が正しくありません',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// メール形式チェック（任意入力）
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'メールアドレスの形式が正しくありません',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 受信者向け本文
$line = str_repeat('━', 28);
$bodyShop  = "貸しスタジオの予約フォームから\n";
$bodyShop .= "新しいお問い合わせがありました。\n\n";
$bodyShop .= $line . "\n";
$bodyShop .= " お名前　　 ： " . $name . "\n";
$bodyShop .= " 電話番号　 ： " . $phone . "\n";
$bodyShop .= " メール　　 ： " . ($email !== '' ? $email : '（未入力）') . "\n";
$bodyShop .= "\n";
$bodyShop .= " ご利用目的 ： " . $usage . "\n";
$bodyShop .= " ご利用時間 ： " . $duration . "\n";
$bodyShop .= " ご希望日時 ： " . $date . "\n";
$bodyShop .= "\n";
$bodyShop .= " ご要望　　 ：\n " . ($message !== '' ? $message : '（なし）') . "\n";
$bodyShop .= $line . "\n";
$bodyShop .= "\n";
$bodyShop .= "受信日時： " . date('Y-m-d H:i:s') . "\n";
$bodyShop .= "送信元IP： " . ($_SERVER['REMOTE_ADDR'] ?? '不明') . "\n";

// 受信メール送信
$fromMime = '=?UTF-8?B?' . base64_encode($FROM_NAME) . '?=';
$headersShop = "From: {$fromMime} <{$FROM_EMAIL}>\r\n";
if ($email !== '') {
    $headersShop .= "Reply-To: {$email}\r\n";
}
$headersShop .= "X-Mailer: PHP/" . phpversion();

$sentShop = mb_send_mail($SHOP_EMAIL, $SHOP_SUBJECT, $bodyShop, $headersShop);

// 自動返信（メール入力されているときだけ）
$sentAuto = null;
if ($email !== '') {
    $bodyAuto  = "この度はオクデラメディカル 貸しスタジオへ\n";
    $bodyAuto .= "お問い合わせいただき、誠にありがとうございます。\n\n";
    $bodyAuto .= "下記の内容で承りました。\n";
    $bodyAuto .= "担当者より改めてご連絡差し上げますので、今しばらくお待ちください。\n\n";
    $bodyAuto .= $line . "\n";
    $bodyAuto .= " お名前　　 ： " . $name . "\n";
    $bodyAuto .= " 電話番号　 ： " . $phone . "\n";
    $bodyAuto .= " ご利用目的 ： " . $usage . "\n";
    $bodyAuto .= " ご利用時間 ： " . $duration . "\n";
    $bodyAuto .= " ご希望日時 ： " . $date . "\n";
    if ($message !== '') {
        $bodyAuto .= " ご要望　　 ：\n " . $message . "\n";
    }
    $bodyAuto .= $line . "\n\n";
    $bodyAuto .= "お急ぎの場合は、お電話（03-3919-5111）にて\n";
    $bodyAuto .= "お気軽にお問い合わせください。\n\n";
    $bodyAuto .= "────────────────────────────\n";
    $bodyAuto .= "オクデラメディカル 貸しスタジオ\n";
    $bodyAuto .= "〒114-0022 東京都北区王子2-26-2\n";
    $bodyAuto .= "ウエルネスオクデラビル 4階\n";
    $bodyAuto .= "TEL: 03-3919-5111 ／ FAX: 03-3919-5114\n";
    $bodyAuto .= "Email: okudera@carrot.ocn.ne.jp\n";
    $bodyAuto .= "────────────────────────────\n\n";
    $bodyAuto .= "※このメールは自動送信です。\n";
    $bodyAuto .= "　このメールへの返信はできません。\n";

    $headersAuto  = "From: {$fromMime} <{$FROM_EMAIL}>\r\n";
    $headersAuto .= "Reply-To: {$SHOP_EMAIL}\r\n";
    $headersAuto .= "X-Mailer: PHP/" . phpversion();

    $sentAuto = mb_send_mail($email, $AUTO_SUBJECT, $bodyAuto, $headersAuto);
}

if (!$sentShop) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'メール送信に失敗しました。お手数ですがお電話でご連絡ください。',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'ok' => true,
    'message' => 'お問い合わせを受け付けました',
    'auto_reply' => $sentAuto,
], JSON_UNESCAPED_UNICODE);
