using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Serves as the base core component for all specialized character Talents,
    /// inheriting full mathematical tracking from CharacterElement.
    /// </summary>
    public class Talent : CharacterElement
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Talent.
        /// </summary>
        public static Collection<Talent> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new ArgumentNullException(nameof(characterElements), "Filter expects a CharacterElements object");
            }

            var filteredList = new List<Talent>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Talent talentInstance)
                {
                    filteredList.Add(talentInstance);
                }
            });

            return new Collection<Talent>(filteredList);
        }

        /// <summary>
        /// Instantiates a Talent component and forwards option parameters to the base CharacterElement initialization pipeline.
        /// </summary>
        public Talent(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of basic or advanced Talent metrics.
    /// </summary>
    public class Talents : Collection<Talent>
    {
        public Talents() : base() { }

        public Talents(IEnumerable<Talent> items) : base(items) { }
    }
}
