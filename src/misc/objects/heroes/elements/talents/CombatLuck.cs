using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Combat Luck talent module.
    /// </summary>
    public class CombatLuck : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from CombatLuck.
        /// </summary>
        public static new Collection<CombatLuck> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<CombatLuck>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is CombatLuck targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<CombatLuck>(filteredList);
        }

        /// <summary>
        /// Instantiates a CombatLuck talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public CombatLuck(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Combat Luck talents.
    /// </summary>
    public class CombatLuckTalents : Collection<CombatLuck>
    {
        public CombatLuckTalents() : base() { }
        public CombatLuckTalents(IEnumerable<CombatLuck> items) : base(items) { }
    }
}