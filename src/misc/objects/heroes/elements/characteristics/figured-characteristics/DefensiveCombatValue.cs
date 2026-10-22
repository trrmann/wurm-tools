using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Defensive Combat Value (DCV) figured characteristic of an entity,
    /// calculating defensive agility thresholds directly from Dexterity attributes.
    /// </summary>
    public class DefensiveCombatValue : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from DefensiveCombatValue.
        /// </summary>
        public static new Collection<DefensiveCombatValue> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<DefensiveCombatValue>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is DefensiveCombatValue dcvInstance)
                {
                    filteredList.Add(dcvInstance);
                }
            });

            return new Collection<DefensiveCombatValue>(filteredList);
        }

        /// <summary>
        /// Instantiates a DefensiveCombatValue figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public DefensiveCombatValue(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Defensive Combat Value";
            options["ShortName"] = "DCV";
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

                throw new InvalidOperationException("Defensive Combat Value Base Value requires a valid Dexterity object");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Defensive Combat Value attributes.
    /// </summary>
    public class DefensiveCombatValues : Collection<DefensiveCombatValue>
    {
        public DefensiveCombatValues() : base() { }
        public DefensiveCombatValues(IEnumerable<DefensiveCombatValue> items) : base(items) { }
    }
}
