using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Bump of Direction talent module.
    /// </summary>
    public class BumpOfDirection : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from BumpOfDirection.
        /// </summary>
        public static new Collection<BumpOfDirection> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<BumpOfDirection>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is BumpOfDirection targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<BumpOfDirection>(filteredList);
        }

        /// <summary>
        /// Instantiates a BumpOfDirection talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public BumpOfDirection(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Bump of Direction talents.
    /// </summary>
    public class BumpOfDirectionTalents : Collection<BumpOfDirection>
    {
        public BumpOfDirectionTalents() : base() { }
        public BumpOfDirectionTalents(IEnumerable<BumpOfDirection> items) : base(items) { }
    }
}