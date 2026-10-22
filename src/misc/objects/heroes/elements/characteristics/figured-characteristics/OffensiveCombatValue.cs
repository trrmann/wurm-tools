using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Offensive Combat Value (OCV) figured characteristic,
    /// calculating combat offensive capabilities from the Dexterity attribute.
    /// </summary>
    public class OffensiveCombatValue : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from OffensiveCombatValue.
        /// </summary>
        public static new Collection<OffensiveCombatValue> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<OffensiveCombatValue>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is OffensiveCombatValue ocvInstance)
                {
                    filteredList.Add(ocvInstance);
                }
            });

            return new Collection<OffensiveCombatValue>(filteredList);
        }

        /// <summary>
        /// Instantiates an Offensive Combat Value figured characteristic mapping cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public OffensiveCombatValue(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
        {
        }

        /// <summary>
        /// Intercepts and builds the parameters block to evaluate base attributes against formula constraints.
        /// </summary>
        private static IDictionary<string, object> NormalizeOptions(IDictionary<string, object> options)
        {
            options = options == null
                ? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(options, StringComparer.OrdinalIgnoreCase);

            // Forward default structural system properties matching the base configuration definition
            options["Name"] = "Offensive Combat Value";
            options["ShortName"] = "OCV";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["BaseValue"] = MixedNumber.From(0);

            // Inject the dynamic base value calculation logic rule array
            options["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                if (parameters.ContainsKey("characterElements") && parameters["characterElements"] is CharacterElements characterElements)
                {
                    var dexCollection = typeof(Dexterity).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                    object dexterityCharacteristic = dexCollection?.Cast<object>().FirstOrDefault();

                    if (dexterityCharacteristic != null)
                    {
                        double dexVal = Convert.ToDouble(dexterityCharacteristic.GetType().GetMethod("Value")?.Invoke(dexterityCharacteristic, null));
                        return MixedNumber.From(dexVal).Divide(3);
                    }
                }

                throw new InvalidOperationException("Offensive Combat Value Base Value requires a valid Dexterity object");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Offensive Combat Value attributes.
    /// </summary>
    public class OffensiveCombatValues : Collection<OffensiveCombatValue>
    {
        public OffensiveCombatValues() : base() { }
        public OffensiveCombatValues(IEnumerable<OffensiveCombatValue> items) : base(items) { }
    }
}
