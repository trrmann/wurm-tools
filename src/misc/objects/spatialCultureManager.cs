namespace Common.Base
{
    public static class SpatialCultureManager
    {
        public static SpatialCultureMetadata NormalizeCulture(object culture)
        {
            if (culture == null) return null;
            if (culture is string cultureStr)
            {
                string language = cultureStr.Split('-', '_')[0].ToLower();
                bool outsideIn = new[] { "ja", "ko", "zh" }.Contains(language);
                return new SpatialCultureMetadata
                {
                    Code = cultureStr,
                    Locale = cultureStr,
                    NameOrder = outsideIn ? "outside-in" : "inside-out"
                };
            }
            if (culture is SpatialCultureMetadata targetMeta)
            {
                return targetMeta;
            }
            throw new TypeErrorException("Culture metadata must be a culture code string or metadata object");
        }
    }
}