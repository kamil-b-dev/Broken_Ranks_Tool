BEGIN IMMEDIATE;

ALTER TABLE item_templates
    ADD COLUMN profile TEXT NOT NULL DEFAULT 'UNSPECIFIED'
    CHECK (profile IN ('PHYSICAL', 'MAGICAL', 'UNIVERSAL', 'UNSPECIFIED'));

ALTER TABLE item_templates
    ADD COLUMN class_scope TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (class_scope IN ('UNKNOWN', 'UNIVERSAL', 'RESTRICTED'));

CREATE TABLE item_template_classes (
    item_template_id INTEGER NOT NULL,
    character_class TEXT NOT NULL
        CHECK (character_class IN (
            'BARBARIAN',
            'KNIGHT',
            'ARCHER',
            'FIRE_MAGE',
            'DRUID',
            'SHEED',
            'VOODOO'
        )),
    PRIMARY KEY (item_template_id, character_class),
    FOREIGN KEY (item_template_id) REFERENCES item_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_item_templates_profile ON item_templates(profile);
CREATE INDEX idx_item_template_classes_class
    ON item_template_classes(character_class, item_template_id);

UPDATE item_templates
SET profile = CASE
    WHEN category IN ('WEAPON_1H', 'WEAPON_2H', 'WEAPON_RANGED') THEN 'UNSPECIFIED'
    WHEN
        (stats LIKE '%Siła:%' OR stats LIKE '%Zręczność:%')
        AND (stats LIKE '%Moc:%' OR stats LIKE '%Wiedza:%')
        THEN 'UNIVERSAL'
    WHEN stats LIKE '%Siła:%' OR stats LIKE '%Zręczność:%' THEN 'PHYSICAL'
    WHEN stats LIKE '%Moc:%' OR stats LIKE '%Wiedza:%' THEN 'MAGICAL'
    ELSE 'UNIVERSAL'
END;

COMMIT;
