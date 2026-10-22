
namespace Heros.Base
{
    /// <summary>
    /// Represents a structural attribute element of a gaming character, 
    /// inheriting full mathematical tracking from HerosValue.
    /// </summary>
    public class CharacterElement : Base.HerosValue
    {
        // Encapsulated backing fields mirroring private JS fields (#points, #name, #shortName)
        private readonly string _name;
        private readonly string _shortName;

        /// <summary>
        /// Instantiates a CharacterElement mapping structural fallbacks and constructor arguments.
        /// </summary>
        public CharacterElement(IDictionary<string, object> options = null) : base(options)
        {
            options ??= new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            // Extract option flags with default structural fallback rules matching the JS source
            string nameOption = options.ContainsKey("Name") ? options["Name"]?.ToString() : "Character Element";
            string shortNameOption = options.ContainsKey("ShortName") ? options["ShortName"]?.ToString() : "CELE";

            // Immutable structural assignment
            this._name = nameOption;
            this._shortName = shortNameOption;
        }

        /// <summary>
        /// Gets the descriptive display name of the element.
        /// </summary>
        public string Name
        {
            get => this._name;
        }

        /// <summary>
        /// Gets the standardized short code acronym of the element.
        /// </summary>
        public string ShortName
        {
            get => this._shortName;
        }

        /// <summary>
        /// Resolves the final computed algebraic metric representation of this element.
        /// </summary>
        public double Value()
        {
            return this.ToNumber();
        }
    }
}
