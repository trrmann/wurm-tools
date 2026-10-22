using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Eidetic Memory talent module.
    /// </summary>
    public class EideticMemory : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from EideticMemory.
        /// </summary>
        public static new Collection<EideticMemory> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<EideticMemory>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is EideticMemory targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<EideticMemory>(filteredList);
        }

        /// <summary>
        /// Instantiates an EideticMemory talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public EideticMemory(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Eidetic Memory talents.
    /// </summary>
    public class EideticMemoryTalents : Collection<EideticMemory>
    {
        public EideticMemoryTalents() : base() { }
        public EideticMemoryTalents(IEnumerable<EideticMemory> items) : base(items) { }
    }
}
