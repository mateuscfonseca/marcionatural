-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Tabela de tipos de atividade (catalogo compartilhado)
CREATE TABLE IF NOT EXISTS activity_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    is_positive BOOLEAN NOT NULL,
    base_points INTEGER NOT NULL,
    is_validated BOOLEAN DEFAULT TRUE,
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Tabela de votos em activity_types (não em entradas!)
CREATE TABLE IF NOT EXISTS activity_type_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type_id INTEGER NOT NULL,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (activity_type_id) REFERENCES activity_types(id),
    UNIQUE (user_id, activity_type_id)
);

-- Tabela de reports de entradas suspeitas
CREATE TABLE IF NOT EXISTS entry_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    reporter_user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES user_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_user_id) REFERENCES users(id),
    UNIQUE (entry_id, reporter_user_id)
);

-- Tabela de entradas dos usuários
CREATE TABLE IF NOT EXISTS user_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    photo_original_name TEXT,
    photo_identifier TEXT UNIQUE,
    duration_minutes INTEGER,
    points INTEGER NOT NULL DEFAULT 0,
    entry_date DATE,
    is_invalidated BOOLEAN DEFAULT FALSE,
    invalidated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (activity_type_id) REFERENCES activity_types(id)
);

-- Tabela de projetos pessoais
CREATE TABLE IF NOT EXISTS personal_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    weekly_hours_goal INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de registros diários de projeto pessoal
CREATE TABLE IF NOT EXISTS project_daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES personal_projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(project_id, date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_entries_user_id ON user_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entries_activity_type ON user_entries(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_user_entries_entry_date ON user_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_user_entries_user_date ON user_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_activity_type_votes ON activity_type_votes(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_project_logs_project ON project_daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_logs_user_date ON project_daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_types_category ON activity_types(category_id);
CREATE INDEX IF NOT EXISTS idx_entry_reports_entry ON entry_reports(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_reports_reporter ON entry_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_entries_invalidated ON user_entries(is_invalidated);
