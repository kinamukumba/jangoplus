-- Jango+ Sekulo: MySQL Database Schema

CREATE DATABASE IF NOT EXISTS jangoplus_sekulo;
USE jangoplus_sekulo;

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

-- Simulados / Exames
CREATE TABLE IF NOT EXISTS exam_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score_percentage DECIMAL(5,2) NOT NULL,
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
    course_category VARCHAR(100) NOT NULL, -- e.g., 'Engenharia', 'Saude', 'Sociais', 'Economicas'
    specific_course VARCHAR(150) NOT NULL,  -- e.g., 'Engenharia Informática', 'Medicina'
    study_hours_day DECIMAL(3,1) DEFAULT 2.0,
    motivation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Roadmap Personalizado Gerado
CREATE TABLE IF NOT EXISTS user_roadmap (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,      -- e.g. 'Matemática', 'Física'
    topic VARCHAR(150) NOT NULL,        -- e.g. 'Cinemática Vetorial'
    description TEXT,                   -- Breve descrição da IA sobre o que focar
    order_num INT NOT NULL,             -- Ordem sequencial
    status ENUM('locked', 'available', 'completed') DEFAULT 'locked',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

