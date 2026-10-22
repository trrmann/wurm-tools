using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Ambidexterity talent module.
    /// </summary>
    public class Ambidexterity : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Ambidexterity.
        /// </summary>
        public static new Collection<Ambidexterity> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Ambidexterity>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Ambidexterity targetInstance)
                {
                    filteredList.Add(targetInstance);
                }
            });

            return new Collection<Ambidexterity>(filteredList);
        }

        /// <summary>
        /// Instantiates an Ambidexterity talent and forwards parameters to the base Talent pipeline.
        /// </summary>
        public Ambidexterity(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for portfolios of Ambidexterity talents.
    /// </summary>
    public class AmbidexterityTalents : Collection<Ambidexterity>
    {
        public AmbidexterityTalents() : base() { }
        public AmbidexterityTalents(IEnumerable<Ambidexterity> items) : base(items) { }
    }
}