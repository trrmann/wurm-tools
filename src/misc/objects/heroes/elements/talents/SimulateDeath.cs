using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Simulate Death talent element, inheriting full mathematical tracking from Talent.
    /// </summary>
    public class SimulateDeath : Talent
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from SimulateDeath.
        /// </summary>
        public static new Collection<SimulateDeath> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<SimulateDeath>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is SimulateDeath simulateDeathInstance)
                {
                    filteredList.Add(simulateDeathInstance);
                }
            });

            return new Collection<SimulateDeath>(filteredList);
        }

        /// <summary>
        /// Instantiates a SimulateDeath component and forwards option parameters to the base Talent initialization pipeline.
        /// </summary>
        public SimulateDeath(IDictionary<string, object> options = null) : base(options)
        {
            // Forwards all pipeline options block arguments down through the underlying constructor chain
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of SimulateDeath talent metrics.
    /// </summary>
    public class SimulateDeathTalents : Collection<SimulateDeath>
    {
        public SimulateDeathTalents() : base() { }

        public SimulateDeathTalents(IEnumerable<SimulateDeath> items) : base(items) { }
    }
}
