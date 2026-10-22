
namespace Heros.Base
{
    /// <summary>
    /// Specialized collection holding CharacterElement components with semantic filter extensions.
    /// </summary>
    public class CharacterElements : Common.Base.Collection<CharacterElement>
    {
        public CharacterElements() : base() { }

        public CharacterElements(IEnumerable<CharacterElement> items) : base(items) { }

        /// <summary>
        /// Queries the collection to retrieve any matching elements matching either display name or short name.
        /// </summary>
        public Common.Base.Collection<CharacterElement> Get(string elementName)
        {
            return this.Filter((element, index, collection) =>
                element.Name == elementName || element.ShortName == elementName
            );
        }
    }
}
