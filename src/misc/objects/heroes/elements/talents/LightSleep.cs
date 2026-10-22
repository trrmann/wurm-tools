using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Light Sleep talent component, duplicating full functionality from the JavaScript definition.
    /// </summary>
    public class LightSleep : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from LightSleep.
        /// </summary>
        public static new Collection<LightSleep> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<LightSleep>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is LightSleep lightSleepInstance)
                {
                    filteredList.Add(lightSleepInstance);
                }
            });

            return new Collection<LightSleep>(filteredList);
        }

        /// <summary>
        /// Instantiates a LightSleep talent and forwards option parameters to the base Talent initialization pipeline.
        /// </summary>
        public LightSleep(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of Light Sleep talents.
    /// </summary>
    public class LightSleepTalents : Collection<LightSleep>
    {
        public LightSleepTalents() : base() { }

        public LightSleepTalents(IEnumerable<LightSleep> items) : base(items) { }
    }
}
