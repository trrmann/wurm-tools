using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Perfect Pitch talent component.
    /// </summary>
    public class PerfectPitch : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from PerfectPitch.
        /// </summary>
        public static new Collection<PerfectPitch> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<PerfectPitch>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is PerfectPitch perfectPitchInstance)
                {
                    filteredList.Add(perfectPitchInstance);
                }
            });

            return new Collection<PerfectPitch>(filteredList);
        }

        /// <summary>
        /// Instantiates a PerfectPitch talent and forwards option parameters to the base Talent initialization pipeline.
        /// </summary>
        public PerfectPitch(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of Perfect Pitch talents.
    /// </summary>
    public class PerfectPitchTalents : Collection<PerfectPitch>
    {
        public PerfectPitchTalents() : base() { }

        public PerfectPitchTalents(IEnumerable<PerfectPitch> items) : base(items) { }
    }
}