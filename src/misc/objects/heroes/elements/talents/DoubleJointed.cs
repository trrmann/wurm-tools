using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Double Jointed talent module.
    /// </summary>
    public class DoubleJointed : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from DoubleJointed.
        /// </summary>
        public static new Collection<DoubleJointed> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<DoubleJointed>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is DoubleJointed targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<DoubleJointed>(filteredList);
        }

        /// <summary>
        /// Instantiates a DoubleJointed talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public DoubleJointed(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Double Jointed talents.
    /// </summary>
    public class DoubleJointedTalents : Collection<DoubleJointed>
    {
        public DoubleJointedTalents() : base() { }
        public DoubleJointedTalents(IEnumerable<DoubleJointed> items) : base(items) { }
    }
}
