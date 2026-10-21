namespace Common.Base
{
    // ==========================================
    // Core Domain Names & Collection Pairs
    // ==========================================

    public class UniverseName : Base.Name { public UniverseName(object val = null) : base(val) { } }

    public class SuperclusterName : Base.Name { public SuperclusterName(object val = null) : base(val) { } }

    public class GalaxyClusterName : Base.Name { public GalaxyClusterName(object val = null) : base(val) { } }

    public class GalaxyName : Base.Name { public GalaxyName(object val = null) : base(val) { } }

    public class StarClusterName : Base.Name { public StarClusterName(object val = null) : base(val) { } }

    public class StarSystemName : Base.Name { public StarSystemName(object val = null) : base(val) { } }

    public class PlanetName : Base.Name { public PlanetName(object val = null) : base(val) { } }

    public class SatelliteName : Base.Name { public SatelliteName(object val = null) : base(val) { } }

    public class ContinentName : Base.Name { public ContinentName(object val = null) : base(val) { } }

    public class CountryName : Base.Name { public CountryName(object val = null) : base(val) { } }

    public class StateProvinceName : Base.Name { public StateProvinceName(object val = null) : base(val) { } }

    public class RegionName : Base.Name { public RegionName(object val = null) : base(val) { } }

    public class CountyName : Base.Name { public CountyName(object val = null) : base(val) { } }

    public class MunicipalityName : Base.Name { public MunicipalityName(object val = null) : base(val) { } }

    public class TownName : Base.Name { public TownName(object val = null) : base(val) { } }

    public class VillageName : Base.Name { public VillageName(object val = null) : base(val) { } }

    public class CityName : Base.Name { public CityName(object val = null) : base(val) { } }

    public class DistrictName : Base.Name { public DistrictName(object val = null) : base(val) { } }

    public class WardName : Base.Name { public WardName(object val = null) : base(val) { } }

    public class NeighborhoodName : Base.Name { public NeighborhoodName(object val = null) : base(val) { } }

    public class LandmarkName : Base.Name { public LandmarkName(object val = null) : base(val) { } }

    public class PostalCodeName : Base.Name { public PostalCodeName(object val = null) : base(val) { } }

    public class AddressLineName : Base.Name { public AddressLineName(object val = null) : base(val) { } }

    public class StreetName : Base.Name { public StreetName(object val = null) : base(val) { } }

    public class StreetNumber : Base.Name { public StreetNumber(object val = null) : base(val) { } }

    public class CampusName : Base.Name { public CampusName(object val = null) : base(val) { } }

    public class ParcelName : Base.Name { public ParcelName(object val = null) : base(val) { } }

    public class BlockName : Base.Name { public BlockName(object val = null) : base(val) { } }

    public class BuildingName : Base.Name { public BuildingName(object val = null) : base(val) { } }

    public class BuildingNumber : Base.Name { public BuildingNumber(object val = null) : base(val) { } }

    public class EntranceName : Base.Name { public EntranceName(object val = null) : base(val) { } }

    public class StairwellName : Base.Name { public StairwellName(object val = null) : base(val) { } }

    public class FloorName : Base.Name { public FloorName(object val = null) : base(val) { } }

    public class UnitName : Base.Name { public UnitName(object val = null) : base(val) { } }

    public class RoomName : Base.Name { public RoomName(object val = null) : base(val) { } }

    public class BunkNumber : Base.Name
    {
        public BunkNumber(object value = null) : base(HandleIntegerFallback(value)) { }

        private static object HandleIntegerFallback(object value)
        {
            if (value is int intVal)
            {
                if (intVal < 0) throw new ArgumentOutOfRangeException(nameof(value), "Bunk number must be a non-negative safe integer");
                return intVal.ToString();
            }
            if (value is long longVal)
            {
                if (longVal < 0) throw new ArgumentOutOfRangeException(nameof(value), "Bunk number must be a non-negative safe integer");
                return longVal.ToString();
            }
            return value ?? "";
        }
    }

    public class PostOfficeBoxNumber : Base.Name
    {
        public PostOfficeBoxNumber(object value = null) : base(HandleIntegerFallback(value)) { }

        private static object HandleIntegerFallback(object value)
        {
            if (value is int intVal)
            {
                if (intVal < 0) throw new ArgumentOutOfRangeException(nameof(value), "Post office box number must be a non-negative safe integer");
                return intVal.ToString();
            }
            if (value is long longVal)
            {
                if (longVal < 0) throw new ArgumentOutOfRangeException(nameof(value), "Post office box number must be a non-negative safe integer");
                return longVal.ToString();
            }
            return value ?? "";
        }
    }

    public class PlaceName : Base.ThingName
    {
        public PlaceName(object value = null, object metadata = null) 
            : base(value, metadata) { }
    }
}