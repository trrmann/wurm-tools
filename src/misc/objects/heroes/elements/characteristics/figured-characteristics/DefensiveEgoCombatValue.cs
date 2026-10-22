using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Defensive Ego Combat Value (DECV) figured characteristic of an entity,
    /// calculating defensive psychic combat thresholds directly from Ego attributes.
    /// </summary>
    public class DefensiveEgoCombatValue : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from DefensiveEgoCombatValue.
        /// </summary>
        public static new Collection<DefensiveEgoCombatValue> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<DefensiveEgoCombatValue>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is DefensiveEgoCombatValue decvInstance)
                {
                    filteredList.Add(decvInstance);
                }
            });

            return new Collection<DefensiveEgoCombatValue>(filteredList);
        }

        /// <summary>
        /// Instantiates a DefensiveEgoCombatValue figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public DefensiveEgoCombatValue(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Defensive Ego Combat Value";
            options["ShortName"] = "DECV";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["BaseValue"] = MixedNumber.From(0);

            // Inject the dynamic base value calculation logic rule array
            options["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                if (parameters.ContainsKey("characterElements") && parameters["characterElements"] is CharacterElements characterElements)
                {
                    var egoCollection = typeof(Ego).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                    object egoCharacteristic = egoCollection?.Cast<object>().FirstOrDefault();

                    if (egoCharacteristic != null)
                    {
                        double egoVal = Convert.ToDouble(egoCharacteristic.GetType().GetMethod("Value")?.Invoke(egoCharacteristic, null));
                        return MixedNumber.From(egoVal).Divide(3);
                    }
                }

                throw new InvalidOperationException("Defensive Ego Combat Value Base Value requires a valid Ego object");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Defensive Ego Combat Value attributes.
    /// </summary>
    public class DefensiveEgoCombatValues : Collection<DefensiveEgoCombatValue>
    {
        public DefensiveEgoCombatValues() : base() { }
        public DefensiveEgoCombatValues(IEnumerable<DefensiveEgoCombatValue> items) : base(items) { }
    }
}
