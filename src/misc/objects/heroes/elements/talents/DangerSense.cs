using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Danger Sense talent module.
    /// </summary>
    public class DangerSense : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from DangerSense.
        /// </summary>
        public static new Collection<DangerSense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<DangerSense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is DangerSense targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<DangerSense>(filteredList);
        }

        /// <summary>
        /// Instantiates a DangerSense talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public DangerSense(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Danger Sense talents.
    /// </summary>
    public class DangerSenseTalents : Collection<DangerSense>
    {
        public DangerSenseTalents() : base() { }
        public DangerSenseTalents(IEnumerable<DangerSense> items) : base(items) { }
    }
}
