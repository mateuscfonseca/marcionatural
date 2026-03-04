-- Seeds iniciais

-- Categorias
INSERT OR IGNORE INTO categories (id, name, description) VALUES
    (1, 'refeicao', 'Registro de alimentação - limpa ou suja'),
    (2, 'exercicio', 'Atividades físicas e exercícios'),
    (3, 'projeto_pessoal', 'Projetos pessoais de longo prazo'),
    (4, 'entorpecentes', 'Uso de substâncias entorpecentes');

-- Tipos de atividade padrão
INSERT OR IGNORE INTO activity_types (id, name, category_id, is_positive, base_points, is_validated) VALUES
    -- Alimentação
    (1, 'Alimentação Limpa', 1, TRUE, 10, TRUE),
    (2, 'Alimentação Suja', 1, FALSE, -10, TRUE),
    -- Exercícios
    (3, 'Exercício Físico', 2, TRUE, 5, TRUE),
    -- Entorpecentes
    (4, 'Usar Tabaco', 4, FALSE, -5, TRUE);
