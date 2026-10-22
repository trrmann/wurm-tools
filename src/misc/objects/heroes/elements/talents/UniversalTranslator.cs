using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Universal Translator talent element, forwarding all initialization properties
    /// to the parent Talent system framework.
    /// </summary>
    public class UniversalTranslator : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from UniversalTranslator.
        /// </summary>
        public static new Collection<UniversalTranslator> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<UniversalTranslator>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is UniversalTranslator translatorInstance)
                {
                    filteredList.Add(translatorInstance);
                }
            });

            return new Collection<UniversalTranslator>(filteredList);
        }

        /// <summary>
        /// Instantiates a UniversalTranslator talent, forwarding option parameters to the base Talent pipeline.
        /// </summary>
        public UniversalTranslator(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of Universal Translator talents.
    /// </summary>
    public class UniversalTranslatorTalents : Collection<UniversalTranslator>
    {
        public UniversalTranslatorTalents() : base() { }
        public UniversalTranslatorTalents(IEnumerable<UniversalTranslator> items) : base(items) { }
    }
}