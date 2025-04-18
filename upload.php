<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Включаем вывод ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Обработка загрузки файла
if (isset($_FILES['file'])) {
    $file = $_FILES['file'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    $maxFileSize = 5 * 1024 * 1024; // 5MB
    $type = $_POST['type'] ?? 'dish';
    
    // Логируем информацию о файле
    error_log("File upload attempt: " . print_r($file, true));
    
    // Проверка типа файла
    if (!in_array($file['type'], $allowedTypes)) {
        error_log("Invalid file type: " . $file['type']);
        http_response_code(400);
        echo json_encode(['error' => 'Недопустимый тип файла. Разрешены только JPEG, PNG и GIF']);
        exit;
    }

    // Проверка размера файла
    if ($file['size'] > $maxFileSize) {
        error_log("File too large: " . $file['size'] . " bytes");
        http_response_code(400);
        echo json_encode(['error' => 'Файл слишком большой. Максимальный размер 5MB']);
        exit;
    }

    // Проверка ошибок загрузки
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'Файл превышает максимальный размер, разрешенный в php.ini',
            UPLOAD_ERR_FORM_SIZE => 'Файл превышает максимальный размер, указанный в форме',
            UPLOAD_ERR_PARTIAL => 'Файл был загружен только частично',
            UPLOAD_ERR_NO_FILE => 'Файл не был загружен',
            UPLOAD_ERR_NO_TMP_DIR => 'Отсутствует временная папка',
            UPLOAD_ERR_CANT_WRITE => 'Не удалось записать файл на диск',
            UPLOAD_ERR_EXTENSION => 'Загрузка файла была остановлена расширением PHP'
        ];
        $errorMessage = $errorMessages[$file['error']] ?? 'Неизвестная ошибка загрузки';
        error_log("Upload error: " . $errorMessage);
        http_response_code(400);
        echo json_encode(['error' => $errorMessage]);
        exit;
    }

    // Генерируем уникальное имя файла с префиксом по типу
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $type . '_' . time() . '.' . $extension;
    $path = 'images/' . $filename;

    // Создаем директорию, если её нет
    if (!file_exists('images')) {
        error_log("Creating images directory");
        if (!mkdir('images', 0777, true)) {
            error_log("Failed to create images directory");
            http_response_code(500);
            echo json_encode(['error' => 'Не удалось создать директорию для изображений']);
            exit;
        }
    }

    // Проверяем права доступа к директории
    if (!is_writable('images')) {
        error_log("Images directory is not writable");
        http_response_code(500);
        echo json_encode(['error' => 'Нет прав на запись в директорию images']);
        exit;
    }

    // Перемещаем файл
    if (move_uploaded_file($file['tmp_name'], $path)) {
        // Логируем успешную загрузку
        error_log("File uploaded successfully: {$filename} ({$file['type']}, {$file['size']} bytes)");
        
        echo json_encode([
            'success' => true,
            'path' => $path,
            'filename' => $filename,
            'type' => $type
        ]);
    } else {
        error_log("Failed to move uploaded file: {$file['tmp_name']} to {$path}");
        http_response_code(500);
        echo json_encode(['error' => 'Не удалось сохранить файл']);
    }
} else {
    // Если файл не загружен, возвращаем текущий путь
    $data = json_decode(file_get_contents('php://input'), true);
    $path = $data['imgPath'] ?? '';
    $type = $data['type'] ?? 'dish';
    
    if ($path) {
        $path = str_replace('MegabitMenuData/', '', $path);
    }
    echo json_encode([
        'success' => true,
        'path' => $path,
        'filename' => basename($path),
        'type' => $type
    ]);
} 