using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Combat Sense talent module.
    /// </summary>
    public class CombatSense : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from CombatSense.
        /// </summary>
        public static new Collection<CombatSense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<CombatSense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is CombatSense targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<CombatSense>(filteredList);
        }

        /// <summary>
        /// Instantiates a CombatSense talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public CombatSense(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Combat Sense talents.
    /// </summary>
    public class CombatSenseTalents : Collection<CombatSense>
    {
        public CombatSenseTalents() : base() { }
        public CombatSenseTalents(IEnumerable<CombatSense> items) : base(items) { }
    }
}
