-- 1. Tabela dla szablonów przedmiotów (ItemTemplate)
CREATE TABLE IF NOT EXISTS item_templates (
                                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                                              name TEXT,
                                              category TEXT,
                                              tier TEXT,
                                              req_level INTEGER,
                                              boss TEXT,
                                              capacity INTEGER
);

-- 2. Tabela dla statystyk (Map<String, Integer> stats)
-- Nazwy kolumn muszą pasować do Twojego @CollectionTable i @MapKeyColumn
CREATE TABLE IF NOT EXISTS item_stats (
                                          item_id INTEGER,
                                          stat_name TEXT,
                                          stat_value INTEGER,
                                          FOREIGN KEY (item_id) REFERENCES item_templates(id)
);

-- 3. Tabela dla szablonów kamieni (GemTemplate)
CREATE TABLE IF NOT EXISTS gem_templates (
                                             id INTEGER PRIMARY KEY,
                                             name TEXT,
                                             bonus_stat TEXT,
                                             bonus_value INTEGER
);

-- 4. Tabela dla konkretnych przedmiotów gracza (UserItem)
CREATE TABLE IF NOT EXISTS user_items (
                                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                                          item_template_id INTEGER,
                                          FOREIGN KEY (item_template_id) REFERENCES item_templates(id)
);

-- 5. Tabela dla kamieni włożonych do przedmiotów (UserGem)
CREATE TABLE IF NOT EXISTS user_gems (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         gem_template_id INTEGER,
                                         user_item_id INTEGER,
                                         FOREIGN KEY (gem_template_id) REFERENCES gem_templates(id),
                                         FOREIGN KEY (user_item_id) REFERENCES user_items(id)
);
CREATE TABLE IF NOT EXISTS user_orbs (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         orb_template_id INTEGER,
                                         user_item_id INTEGER,
                                         FOREIGN KEY (orb_template_id) REFERENCES orb_templates(id),
                                         FOREIGN KEY (user_item_id) REFERENCES user_items(id)
);
CREATE TABLE IF NOT EXISTS orb_templates (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         name TEXT,
                                         bonus_stat TEXT,
                                         bonus_value INTEGER,
                                         tier INTEGER,
                                         level INTEGER,
                                         category TEXT
);

