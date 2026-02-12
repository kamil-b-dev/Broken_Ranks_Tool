-- 1. Tabela dla szablonów przedmiotów (ItemTemplate)
CREATE TABLE IF NOT EXISTS item_templates (
                                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                                              name TEXT,
                                              category TEXT,
                                              tier TEXT,
                                              req_level INTEGER,
                                              boss TEXT,
                                              capacity INTEGER,
                                              stats TEXT
);
-- 4. Tabela dla konkretnych przedmiotów gracza (UserItem)
CREATE TABLE IF NOT EXISTS user_items (
                                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                                          item_template_id INTEGER,
                                          FOREIGN KEY (item_template_id) REFERENCES item_templates(id)
);

CREATE TABLE IF NOT EXISTS user_orbs (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         orb_template_id INTEGER,
                                         user_item_id INTEGER,
                                         FOREIGN KEY (orb_template_id) REFERENCES orb_templates(id),
                                         FOREIGN KEY (user_item_id) REFERENCES user_items(id)
);
CREATE TABLE IF NOT EXISTS user_drifs (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         drif_template_id INTEGER,
                                         user_item_id INTEGER,
                                         FOREIGN KEY (drif_template_id) REFERENCES drif_templates(id),
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
CREATE TABLE IF NOT EXISTS drif_templates (
                                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                                              name TEXT,
                                              size TEXT,
                                              bonus_type TEXT,
                                              base_value TEXT,
                                              increment TEXT,
                                              rank_range TEXT,
                                              price INTEGER
);
DROP TABLE IF EXISTS orb_templates;
CREATE TABLE IF NOT EXISTS orb_templates (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             name TEXT,
                                             size TEXT,
                                             category TEXT,
                                             bonus_type TEXT,
                                             bonus_lvl1 TEXT,
                                             bonus_lvl2 TEXT,
                                             bonus_lvl3 TEXT,
                                             rank_range TEXT,
                                             price INTEGER
);

