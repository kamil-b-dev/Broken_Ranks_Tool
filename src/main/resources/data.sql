DELETE FROM item_stats;
DELETE FROM gem_templates;
DELETE FROM item_templates;
INSERT INTO gem_templates (id, name, bonus_stat, bonus_value) VALUES (101, 'Gwiazda Północy', 'WIEDZA', 5);
INSERT INTO gem_templates (id, name, bonus_stat, bonus_value) VALUES (102, 'Serce Lasu', 'PZ', 50);