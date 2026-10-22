using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Lightning Calculator talent component.
    /// </summary>
    public class LightningCalculator : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from LightningCalculator.
        /// </summary>
        public static new Collection<LightningCalculator> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<LightningCalculator>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is LightningCalculator lightningCalculatorInstance)
                {
                    filteredList.Add(lightningCalculatorInstance);
                }
            });

            return new Collection<LightningCalculator>(filteredList);
        }

        /// <summary>
        /// Instantiates a LightningCalculator talent and forwards option parameters to the base Talent initialization pipeline.
        /// </summary>
        public LightningCalculator(IDictionary<string, object> options = null) : base(options)
        {
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of Lightning Calculator talents.
    /// </summary>
    public class LightningCalculatorTalents : Collection<LightningCalculator>
    {
        public LightningCalculatorTalents() : base() { }

        public LightningCalculatorTalents(IEnumerable<LightningCalculator> items) : base(items) { }
    }
}