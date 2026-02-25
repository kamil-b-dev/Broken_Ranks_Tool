package pl.brokenranks.tool.broken_ranks_tool.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class EquipmentRequest {
    // Tutaj użytkownik prześle ID wybranych przedmiotów
    // Null oznacza, że nic nie wybrał w danym slocie
    private Long helmetId;
    private Long armorId;
    private Long capeId;
    private Long legsId;
    private Long bootsId;
    private Long glovesId;
    private Long beltId;
    private Long ring1Id;
    private Long ring2Id;
    private Long necklaceId;
    private Long shieldId;
    private Long weaponId;

    private Long helmetOrbId;
    private Long armorOrbId;
    private Long capeOrbId;
    private Long legsOrbId;
    private Long bootsOrbId;
    private Long glovesOrbId;
    private Long beltOrbId;
    private Long ring1OrbId;
    private Long ring2OrbId;
    private Long necklaceOrbId;
    private Long shieldOrbId;
    private Long weaponOrbId;

    private List<Long> helmetDrifs = new ArrayList<>();
    private List<Long> armorDrifs = new ArrayList<>();
    private List<Long> capeDrifs = new ArrayList<>();
    private List<Long> legsDrifs = new ArrayList<>();
    private List<Long> bootsDrifs = new ArrayList<>();
    private List<Long> glovesDrifs = new ArrayList<>();
    private List<Long> beltDrifs = new ArrayList<>();
    private List<Long> ring1Drifs = new ArrayList<>();
    private List<Long> ring2Drifs = new ArrayList<>();
    private List<Long> necklaceDrifs = new ArrayList<>();
    private List<Long> shieldDrifs = new ArrayList<>();
    private List<Long> weaponDrifs = new ArrayList<>();
}