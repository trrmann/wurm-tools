using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Absolute Range Sense talent module.
    /// </summary>
    public class AbsoluteRangeSense : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from AbsoluteRangeSense.
        /// </summary>
        public static new Collection<AbsoluteRangeSense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<AbsoluteRangeSense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is AbsoluteRangeSense targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<AbsoluteRangeSense>(filteredList);
        }

        /// <summary>
        /// Instantiates an AbsoluteRangeSense talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public AbsoluteRangeSense(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Absolute Range Sense talents.
    /// </summary>
    public class AbsoluteRangeSenseTalents : Collection<AbsoluteRangeSense>
    {
        public AbsoluteRangeSenseTalents() : base() { }
        public AbsoluteRangeSenseTalents(IEnumerable<AbsoluteRangeSense> items) : base(items) { }
    }
}