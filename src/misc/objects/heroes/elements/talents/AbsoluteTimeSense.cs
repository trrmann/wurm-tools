using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Absolute Time Sense talent module.
    /// </summary>
    public class AbsoluteTimeSense : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from AbsoluteTimeSense.
        /// </summary>
        public static new Collection<AbsoluteTimeSense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<AbsoluteTimeSense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is AbsoluteTimeSense targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<AbsoluteTimeSense>(filteredList);
        }

        /// <summary>
        /// Instantiates an AbsoluteTimeSense talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public AbsoluteTimeSense(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Absolute Time Sense talents.
    /// </summary>
    public class AbsoluteTimeSenseTalents : Collection<AbsoluteTimeSense>
    {
        public AbsoluteTimeSenseTalents() : base() { }
        public AbsoluteTimeSenseTalents(IEnumerable<AbsoluteTimeSense> items) : base(items) { }
    }
}