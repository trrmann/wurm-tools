namespace Common.Base
{
    // ==========================================
    // Domain Semantic Aliases (Mapping Tables)
    // ==========================================
    public class SpatialAliases
    {
        public static Type SolarSystemName => typeof(StarSystemName);
        public static Type SolarSystemNames => typeof(StarSystemNames);
        public static Type StateName => typeof(StateProvinceName);
        public static Type StateNames => typeof(StateProvinceNames);
        public static Type ProvinceName => typeof(StateProvinceName);
        public static Type ProvinceNames => typeof(StateProvinceNames);
        public static Type LocalityName => typeof(MunicipalityName);
        public static Type LocalityNames => typeof(MunicipalityNames);
        public static Type SuburbName => typeof(NeighborhoodName);
        public static Type SuburbNames => typeof(NeighborhoodNames);
        public static Type PostcodeName => typeof(PostalCodeName);
        public static Type PostcodeNames => typeof(PostalCodeNames);
        public static Type ZipCodeName => typeof(PostalCodeName);
        public static Type ZipCodeNames => typeof(PostalCodeNames);
        public static Type SiteName => typeof(CampusName);
        public static Type SiteNames => typeof(CampusNames);
        public static Type LotName => typeof(ParcelName);
        public static Type LotNames => typeof(ParcelNames);
        public static Type HouseNumber => typeof(StreetNumber);
        public static Type HouseNumbers => typeof(StreetNumbers);
        public static Type ApartmentName => typeof(UnitName);
        public static Type ApartmentNames => typeof(UnitNames);
        public static Type SuiteName => typeof(UnitName);
        public static Type SuiteNames => typeof(UnitNames);
        public static Type RoomNumber => typeof(RoomName);
        public static Type RoomNumbers => typeof(RoomNames);
        public static Type BunkName => typeof(BunkNumber);
        public static Type BunkNames => typeof(BunkNumbers);
        public static Type POBoxNumber => typeof(PostOfficeBoxNumber);
        public static Type POBoxNumbers => typeof(PostOfficeBoxNumbers);
    }
}