package pl.brokenranks.tool.broken_ranks_tool.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class EquipmentRequest {

    // --- HEŁM ---
    private Long helmetId;
    private Long helmetOrbId;
    private Integer helmetOrbLevel;
    private List<Long> helmetDrifs;
    private Map<String, Integer> helmetDrifLevels;

    // --- ZBROJA ---
    private Long armorId;
    private Long armorOrbId;
    private Integer armorOrbLevel;
    private List<Long> armorDrifs;
    private Map<String, Integer> armorDrifLevels;

    // --- PELERYNA ---
    private Long capeId;
    private Long capeOrbId;
    private Integer capeOrbLevel;
    private List<Long> capeDrifs;
    private Map<String, Integer> capeDrifLevels;

    // --- SPODNIE ---
    private Long legsId;
    private Long legsOrbId;
    private Integer legsOrbLevel;
    private List<Long> legsDrifs;
    private Map<String, Integer> legsDrifLevels;

    // --- BUTY ---
    private Long bootsId;
    private Long bootsOrbId;
    private Integer bootsOrbLevel;
    private List<Long> bootsDrifs;
    private Map<String, Integer> bootsDrifLevels;

    // --- RĘKAWICE ---
    private Long glovesId;
    private Long glovesOrbId;
    private Integer glovesOrbLevel;
    private List<Long> glovesDrifs;
    private Map<String, Integer> glovesDrifLevels;

    // --- PAS ---
    private Long beltId;
    private Long beltOrbId;
    private Integer beltOrbLevel;
    private List<Long> beltDrifs;
    private Map<String, Integer> beltDrifLevels;

    // --- BROŃ ---
    private Long weaponId;
    private Long weaponOrbId;
    private Integer weaponOrbLevel;
    private List<Long> weaponDrifs;
    private Map<String, Integer> weaponDrifLevels;

    // --- TARCZA / DRUGA RĘKA ---
    private Long shieldId;
    private Long shieldOrbId;
    private Integer shieldOrbLevel;
    private List<Long> shieldDrifs;
    private Map<String, Integer> shieldDrifLevels;

    // --- PIERŚCIEŃ 1 ---
    private Long ring1Id;
    private Long ring1OrbId;
    private Integer ring1OrbLevel;
    private List<Long> ring1Drifs;
    private Map<String, Integer> ring1DrifLevels;

    // --- PIERŚCIEŃ 2 ---
    private Long ring2Id;
    private Long ring2OrbId;
    private Integer ring2OrbLevel;
    private List<Long> ring2Drifs;
    private Map<String, Integer> ring2DrifLevels;

    // --- NASZYJNIK ---
    private Long necklaceId;
    private Long necklaceOrbId;
    private Integer necklaceOrbLevel;
    private List<Long> necklaceDrifs;
    private Map<String, Integer> necklaceDrifLevels;

}