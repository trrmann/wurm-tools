using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Speed Reading talent element, inheriting functional 
    /// configuration and mathematical value tracking from the base Talent class.
    /// </summary>
    public class SpeedReading : Talent
    {
        /// <summary>
        /// Filters a collection of general character elements to isolate instances of SpeedReading.
        /// </summary>
        /// <param name="characterElements">The structural collection of character assets to filter.</param>
        /// <returns>A typed collection containing only SpeedReading talent elements.</returns>
        /// <exception cref="TypeErrorException">Thrown when the input container is null or mismatched.</exception>
        public static new Collection<SpeedReading> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<SpeedReading>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is SpeedReading speedReadingInstance)
                {
                    filteredList.Add(speedReadingInstance);
                }
            });

            return new Collection<SpeedReading>(filteredList);
        }

        /// <summary>
        /// Instantiates a SpeedReading talent instance and forwards configuration options 
        /// to the underlying base Talent initialization pipeline.
        /// </summary>
        /// <param name="options">The dictionary parameter mapping points, value functions, boundaries, and optional modifiers.</param>
        public SpeedReading(IDictionary<string, object> options = null) : base(options)
        {
            // Properties block mapping cascade includes: Points, AbsoluteMinValue, AbsoluteMaxValue, MinValue, 
            // UnderMinValueRate, MaxValue, OverMaxValueRate, ValueRate, BaseValue, BaseValueFunction, 
            // OptionFlagCollection, and ValueFunction parameters into the underlying parent architecture.
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of SpeedReading talent elements.
    /// </summary>
    public class SpeedReadingTalents : Collection<SpeedReading>
    {
        public SpeedReadingTalents() : base() { }

        public SpeedReadingTalents(IEnumerable<SpeedReading> items) : base(items) { }
    }
}
