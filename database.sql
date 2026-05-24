-- Jango+ Sekulo: MySQL Database Schema v2.0


-- Usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    onboarded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Estatísticas Gerais do Usuário (Para o Sekulo)
CREATE TABLE IF NOT EXISTS user_stats (
    user_id INT PRIMARY KEY,
    xp_total INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    delay_days INT DEFAULT 0,
    weekly_xp INT DEFAULT 0,
    league VARCHAR(20) DEFAULT 'bronze',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Missões Diárias
CREATE TABLE IF NOT EXISTS daily_missions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mission_date DATE NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    bio_target INT DEFAULT 0,
    qui_target INT DEFAULT 0,
    fis_target INT DEFAULT 0,
    lp_target INT DEFAULT 0,
    mat_target INT DEFAULT 0,
    rev_target INT DEFAULT 0,
    bio_completed INT DEFAULT 0,
    qui_completed INT DEFAULT 0,
    fis_completed INT DEFAULT 0,
    lp_completed INT DEFAULT 0,
    mat_completed INT DEFAULT 0,
    rev_completed INT DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, mission_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Simulados / Exames (com métricas de erros por disciplina)
CREATE TABLE IF NOT EXISTS exam_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score_percentage DECIMAL(5,2) NOT NULL,
    correct_count TINYINT DEFAULT 0,
    total_questions TINYINT DEFAULT 10,
    weak_subjects JSON NULL,           -- ex: ["Física","Química"]
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trigger para inicializar stats no momento de criar o usuário
DROP TRIGGER IF EXISTS after_user_insert;
DELIMITER //
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.id);
END;//
DELIMITER ;

-- Respostas do Inquérito de Onboarding
CREATE TABLE IF NOT EXISTS user_onboarding (
    user_id INT PRIMARY KEY,
    university VARCHAR(150) NOT NULL,
    course_category VARCHAR(100) NOT NULL,
    specific_course VARCHAR(150) NOT NULL,
    study_hours_day DECIMAL(3,1) DEFAULT 2.0,
    motivation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Roadmap Personalizado Gerado
CREATE TABLE IF NOT EXISTS user_roadmap (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(150) NOT NULL,
    description TEXT,
    order_num INT NOT NULL,
    status ENUM('locked', 'available', 'completed') DEFAULT 'locked',
    is_review TINYINT(1) DEFAULT 0,    -- 1 = nó criado por erros do simulado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- NOVAS TABELAS v2.0
-- ─────────────────────────────────────────────

-- Sessões diárias (DAU/MAU, tempo médio de estudo)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_date DATE NOT NULL,
    duration_minutes INT DEFAULT 1,
    UNIQUE KEY uq_user_session_date (user_id, session_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Resultados do Quiz Diagnóstico (pré-geração de roadmap)
CREATE TABLE IF NOT EXISTS diagnostic_results (
    user_id INT PRIMARY KEY,
    weak_subjects JSON NOT NULL,       -- ["Física", "Química"]
    strong_subjects JSON NOT NULL,     -- ["Matemática", "Português"]
    raw_scores JSON NOT NULL,          -- {"Matemática": 80, "Física": 40}
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Migrações para BDs já existentes (v1 → v2)
-- ─────────────────────────────────────────────
-- ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS correct_count TINYINT DEFAULT 0;
-- ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS total_questions TINYINT DEFAULT 10;
-- ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS weak_subjects JSON NULL;
-- ALTER TABLE user_roadmap ADD COLUMN IF NOT EXISTS is_review TINYINT(1) DEFAULT 0;
