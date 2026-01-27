-- BIBLIOTEKA PRZEDMIOTÓW (ItemTemplate)
INSERT INTO item_templates (id, name, category, slot, req_level) VALUES (1, 'Karmazynowa Chwała', 'Psychorara', 'Głowa', 40);
INSERT INTO item_templates (id, name, category, slot, req_level) VALUES (2, 'Oddech Północy', 'Synergetyk', 'Broń', 50);
INSERT INTO item_templates (id, name, category, slot, req_level) VALUES (3, 'Griv', 'Rara', 'Zbroja', 30);

-- STATYSTYKI BAZOWE (item_stats - nazwa tabeli technicznej z mapy w ItemTemplate)
INSERT INTO item_stats (item_id, stat_name, stat_value) VALUES (1, 'MOC', 15);
INSERT INTO item_stats (item_id, stat_name, stat_value) VALUES (1, 'WIEDZA', 10);
INSERT INTO item_stats (item_id, stat_name, stat_value) VALUES (2, 'MOC', 25);
INSERT INTO item_stats (item_id, stat_name, stat_value) VALUES (3, 'Pancerz', 40);

-- BIBLIOTEKA KAMIENI (GemTemplate - teraz bez item_id!)
INSERT INTO gem_templates (id, name, bonus_stat, bonus_value) VALUES (101, 'Gwiazda Północy', 'WIEDZA', 5);
INSERT INTO gem_templates (id, name, bonus_stat, bonus_value) VALUES (102, 'Serce Lasu', 'PZ', 50);
INSERT INTO gem_templates (id, name, bonus_stat, bonus_value) VALUES (103, 'Odłamek Lodu', 'MANA', 30);