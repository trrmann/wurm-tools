using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Lightning Reflexes talent component.
    /// </summary>
    public class LightningReflexes : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from LightningReflexes.
        /// </summary>
        public static new Collection<LightningReflexes> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<LightningReflexes>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is LightningReflexes lightningReflexesInstance)
                {
                    filteredList.Add(lightningReflexesInstance);
                }
            });

            return new Collection<LightningReflexes>(filteredList);
        }

        /// <summary>
        /// Instantiates a LightningReflexes talent and forwards option parameters to the base Talent initialization pipeline.
        /// </summary>
        public LightningReflexes(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of Lightning Reflexes talents.
    /// </summary>
    public class LightningReflexesTalents : Collection<LightningReflexes>
    {
        public LightningReflexesTalents() : base() { }

        public LightningReflexesTalents(IEnumerable<LightningReflexes> items) : base(items) { }
    }
}