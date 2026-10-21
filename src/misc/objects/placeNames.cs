namespace Common.Base
{
    // ==========================================
    // Core Domain Names & Collection Pairs
    // ==========================================

    public class UniverseNames : Base.Names<Base.UniverseName> { public UniverseNames() : base() { } public UniverseNames(object items) : base(items) { } }

    public class SuperclusterNames : Base.Names<Base.SuperclusterName> { public SuperclusterNames() : base() { } public SuperclusterNames(object items) : base(items) { } }

    public class GalaxyClusterNames : Base.Names<Base.GalaxyClusterName> { public GalaxyClusterNames() : base() { } public GalaxyClusterNames(object items) : base(items) { } }

    public class GalaxyNames : Base.Names<Base.GalaxyName> { public GalaxyNames() : base() { } public GalaxyNames(object items) : base(items) { } }

    public class StarClusterNames : Base.Names<Base.StarClusterName> { public StarClusterNames() : base() { } public StarClusterNames(object items) : base(items) { } }

    public class StarSystemNames : Base.Names<Base.StarSystemName> { public StarSystemNames() : base() { } public StarSystemNames(object items) : base(items) { } }

    public class PlanetNames : Base.Names<Base.PlanetName> { public PlanetNames() : base() { } public PlanetNames(object items) : base(items) { } }

    public class SatelliteNames : Base.Names<Base.SatelliteName> { public SatelliteNames() : base() { } public SatelliteNames(object items) : base(items) { } }

    public class ContinentNames : Base.Names<Base.ContinentName> { public ContinentNames() : base() { } public ContinentNames(object items) : base(items) { } }

    public class CountryNames : Base.Names<Base.CountryName> { public CountryNames() : base() { } public CountryNames(object items) : base(items) { } }

    public class StateProvinceNames : Base.Names<Base.StateProvinceName> { public StateProvinceNames() : base() { } public StateProvinceNames(object items) : base(items) { } }

    public class RegionNames : Base.Names<Base.RegionName> { public RegionNames() : base() { } public RegionNames(object items) : base(items) { } }

    public class CountyNames : Base.Names<Base.CountyName> { public CountyNames() : base() { } public CountyNames(object items) : base(items) { } }

    public class MunicipalityNames : Base.Names<Base.MunicipalityName> { public MunicipalityNames() : base() { } public MunicipalityNames(object items) : base(items) { } }

    public class TownNames : Base.Names<Base.TownName> { public TownNames() : base() { } public TownNames(object items) : base(items) { } }

    public class VillageNames : Base.Names<Base.VillageName> { public VillageNames() : base() { } public VillageNames(object items) : base(items) { } }

    public class CityNames : Base.Names<Base.CityName> { public CityNames() : base() { } public CityNames(object items) : base(items) { } }

    public class DistrictNames : Base.Names<Base.DistrictName> { public DistrictNames() : base() { } public DistrictNames(object items) : base(items) { } }

    public class WardNames : Base.Names<Base.WardName> { public WardNames() : base() { } public WardNames(object items) : base(items) { } }

    public class NeighborhoodNames : Base.Names<Base.NeighborhoodName> { public NeighborhoodNames() : base() { } public NeighborhoodNames(object items) : base(items) { } }

    public class LandmarkNames : Base.Names<Base.LandmarkName> { public LandmarkNames() : base() { } public LandmarkNames(object items) : base(items) { } }

    public class PostalCodeNames : Base.Names<Base.PostalCodeName> { public PostalCodeNames() : base() { } public PostalCodeNames(object items) : base(items) { } }

    public class AddressLineNames : Base.Names<Base.AddressLineName> { public AddressLineNames() : base() { } public AddressLineNames(object items) : base(items) { } }

    public class StreetNames : Base.Names<Base.StreetName> { public StreetNames() : base() { } public StreetNames(object items) : base(items) { } }

    public class StreetNumbers : Base.Names<Base.StreetNumber> { public StreetNumbers() : base() { } public StreetNumbers(object items) : base(items) { } }

    public class CampusNames : Base.Names<Base.CampusName> { public CampusNames() : base() { } public CampusNames(object items) : base(items) { } }

    public class ParcelNames : Base.Names<Base.ParcelName> { public ParcelNames() : base() { } public ParcelNames(object items) : base(items) { } }

    public class BlockNames : Base.Names<Base.BlockName> { public BlockNames() : base() { } public BlockNames(object items) : base(items) { } }

    public class BuildingNames : Base.Names<Base.BuildingName> { public BuildingNames() : base() { } public BuildingNames(object items) : base(items) { } }

    public class BuildingNumbers : Base.Names<Base.BuildingNumber> { public BuildingNumbers() : base() { } public BuildingNumbers(object items) : base(items) { } }

    public class EntranceNames : Base.Names<Base.EntranceName> { public EntranceNames() : base() { } public EntranceNames(object items) : base(items) { } }

    public class StairwellNames : Base.Names<Base.StairwellName> { public StairwellNames() : base() { } public StairwellNames(object items) : base(items) { } }

    public class FloorNames : Base.Names<Base.FloorName> { public FloorNames() : base() { } public FloorNames(object items) : base(items) { } }

    public class UnitNames : Base.Names<Base.UnitName> { public UnitNames() : base() { } public UnitNames(object items) : base(items) { } }

    public class RoomNames : Base.Names<Base.RoomName> { public RoomNames() : base() { } public RoomNames(object items) : base(items) { } }

    public class BunkNumbers : Base.Names<Base.BunkNumber> { public BunkNumbers() : base() { } public BunkNumbers(object items) : base(items) { } }

    public class PostOfficeBoxNumbers : Base.Names<Base.PostOfficeBoxNumber> { public PostOfficeBoxNumbers() : base() { } public PostOfficeBoxNumbers(object items) : base(items) { } }

    public class PlaceNames : Collection<Base.PlaceName>
    {
        public PlaceNames() : base() { }

        public PlaceNames(System.Collections.Generic.IEnumerable<Base.PlaceName> items) : base(items) { }
    }
}