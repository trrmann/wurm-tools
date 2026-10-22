using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Environmental Movement talent module.
    /// </summary>
    public class EnvironmentalMovement : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from EnvironmentalMovement.
        /// </summary>
        public static new Collection<EnvironmentalMovement> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<EnvironmentalMovement>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is EnvironmentalMovement targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<EnvironmentalMovement>(filteredList);
        }

        /// <summary>
        /// Instantiates an EnvironmentalMovement talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public EnvironmentalMovement(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Environmental Movement talents.
    /// </summary>
    public class EnvironmentalMovementTalents : Collection<EnvironmentalMovement>
    {
        public EnvironmentalMovementTalents() : base() { }
        public EnvironmentalMovementTalents(IEnumerable<EnvironmentalMovement> items) : base(items) { }
    }
}
