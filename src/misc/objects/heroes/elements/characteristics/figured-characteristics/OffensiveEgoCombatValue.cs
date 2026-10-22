using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Offensive Ego Combat Value (OECV) figured characteristic,
    /// calculating psychic combat accuracy thresholds based on Ego attributes [cite: 10].
    /// </summary>
    public class OffensiveEgoCombatValue : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from OffensiveEgoCombatValue [cite: 10].
        /// </summary>
        public static new Collection<OffensiveEgoCombatValue> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<OffensiveEgoCombatValue>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is OffensiveEgoCombatValue oecvInstance)
                {
                    filteredList.Add(oecvInstance);
                }
            });

            return new Collection<OffensiveEgoCombatValue>(filteredList);
        }

        /// <summary>
        /// Instantiates an OffensiveEgoCombatValue figured characteristic mapping system cost parameters and dynamic dependency fallbacks [cite: 10].
        /// </summary>
        public OffensiveEgoCombatValue(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
        {
        }

        /// <summary>
        /// Intercepts and builds the parameters block to evaluate base attributes against formula constraints [cite: 10].
        /// </summary>
        private static IDictionary<string, object> NormalizeOptions(IDictionary<string, object> options)
        {
            options = options == null
                ? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(options, StringComparer.OrdinalIgnoreCase);

            // Forward default structural system properties matching the base configuration definition
            options["Name"] = "Offensive Ego Combat Value";
            options["ShortName"] = "OECV";
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

                throw new InvalidOperationException("Offensive Ego Combat Value Base Value requires a valid Ego object");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Offensive Ego Combat Values [cite: 10].
    /// </summary>
    public class OffensiveEgoCombatValues : Collection<OffensiveEgoCombatValue>
    {
        public OffensiveEgoCombatValues() : base() { }
        public OffensiveEgoCombatValues(IEnumerable<OffensiveEgoCombatValue> items) : base(items) { }
    }
}
