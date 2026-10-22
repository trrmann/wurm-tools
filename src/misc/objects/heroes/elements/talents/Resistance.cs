using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Resistance talent component for characters,
    /// inheriting from the core base Talent class layout.
    /// </summary>
    public class Resistance : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Resistance.
        /// </summary>
        public static new Collection<Resistance> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Resistance>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Resistance resistanceInstance)
                {
                    filteredList.Add(resistanceInstance);
                }
            });

            return new Collection<Resistance>(filteredList);
        }

        /// <summary>
        /// Instantiates a Resistance component and forwards option parameters to the base Talent initialization pipeline.
        /// </summary>
        public Resistance(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of character Resistance talents.
    /// </summary>
    public class ResistanceTalents : Collection<Resistance>
    {
        public ResistanceTalents() : base() { }

        public ResistanceTalents(IEnumerable<Resistance> items) : base(items) { }
    }
}
