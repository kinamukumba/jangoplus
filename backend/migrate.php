<?php
require_once __DIR__ . '/config/database.php';

try {
    echo "Starting database migrations...\n";

    // 1. Alter users table
    $alterQueries = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL UNIQUE AFTER email",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active TINYINT DEFAULT 0 AFTER display_name",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token VARCHAR(100) NULL AFTER is_active",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' AFTER activation_token"
    ];

    foreach ($alterQueries as $q) {
        try {
            $pdo->exec($q);
            echo "Executed: $q\n";
        } catch (PDOException $e) {
            // Some MySQL versions might throw an error if the column already exists (even with IF NOT EXISTS)
            // or if the syntax is not supported. We log and proceed.
            echo "Notice: Column may already exist or error: " . $e->getMessage() . "\n";
        }
    }

    // 2. Create sekulo_training table
    $createTableQuery = "
        CREATE TABLE IF NOT EXISTS sekulo_training (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_category VARCHAR(100) NOT NULL,
            specific_course VARCHAR(150) NOT NULL,
            topic VARCHAR(150) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($createTableQuery);
    echo "Table 'sekulo_training' verified/created.\n";

    // 3. Insert or update default admin user
    // Let's check if there is an admin email. We will make admin@jangoplus.com a default admin.
    $adminEmail = 'admin@jangoplus.com';
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$adminEmail]);
    $admin = $stmt->fetch();

    $hash = password_hash('admin123', PASSWORD_BCRYPT);

    if (!$admin) {
        $stmtInsert = $pdo->prepare('
            INSERT INTO users (email, phone, password_hash, display_name, is_active, role)
            VALUES (?, ?, ?, ?, 1, ?)
        ');
        $stmtInsert->execute([$adminEmail, '927558120', $hash, 'Administrador Sekulo', 'admin']);
        echo "Default admin user created: email=admin@jangoplus.com, password=admin123\n";
    } else {
        $stmtUpdate = $pdo->prepare('
            UPDATE users SET role = "admin", is_active = 1 WHERE email = ?
        ');
        $stmtUpdate->execute([$adminEmail]);
        echo "Default admin user role updated to admin.\n";
    }

    echo "Migrations completed successfully!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
