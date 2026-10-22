using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Base class for all characteristics whose values are derived from other underlying characteristics.
    /// </summary>
    public class FiguredCharacteristic : Characteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from FiguredCharacteristic.
        /// </summary>
        public static new Collection<FiguredCharacteristic> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<FiguredCharacteristic>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is FiguredCharacteristic figuredInstance)
                {
                    filteredList.Add(figuredInstance);
                }
            });

            return new Collection<FiguredCharacteristic>(filteredList);
        }

        /// <summary>
        /// Instantiates a FiguredCharacteristic mapping constructor arguments and forwarding them to the parent Characteristic pipeline.
        /// </summary>
        public FiguredCharacteristic(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
        {
        }

        /// <summary>
        /// Ensures default structural fallback parameters are applied to the options configuration block.
        /// </summary>
        private static IDictionary<string, object> NormalizeOptions(IDictionary<string, object> options)
        {
            options = options == null
                ? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(options, StringComparer.OrdinalIgnoreCase);

            if (!options.ContainsKey("Name") || options["Name"] == null)
            {
                options["Name"] = "Figured Characteristic";
            }

            if (!options.ContainsKey("ShortName") || options["ShortName"] == null)
            {
                options["ShortName"] = "FCHR";
            }

            if (!options.ContainsKey("RoundingMode") || options["RoundingMode"] == null)
            {
                options["RoundingMode"] = "nearest";
            }

            return options;
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of FiguredCharacteristic attributes.
    /// </summary>
    public class FiguredCharacteristics : Collection<FiguredCharacteristic>
    {
        public FiguredCharacteristics() : base() { }
        public FiguredCharacteristics(IEnumerable<FiguredCharacteristic> items) : base(items) { }
    }
}
