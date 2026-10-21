namespace Common.Base
{
    // Type definition for Culture Metadata matching JS object shape
    public class CultureMetadata
    {
        public string Code { get; set; }
        public string Locale { get; set; }
        public object NameOrder { get; set; } // Can be a string or a List<string>
        public string Separator { get; set; } = " ";
        public List<string> RequiredComponents { get; set; } = new List<string>();
        public Func<Dictionary<string, object>, string> FormatName { get; set; }
    }
}