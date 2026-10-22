using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the overall Ego Combat Value (ECV) figured characteristic,
    /// dynamically calculating unified psychic combat thresholds from distinct offense/defense tracks or raw Ego.
    /// </summary>
    public class EgoCombatValue : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from EgoCombatValue.
        /// </summary>
        public static new Collection<EgoCombatValue> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<EgoCombatValue>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is EgoCombatValue ecvInstance)
                {
                    filteredList.Add(ecvInstance);
                }
            });

            return new Collection<EgoCombatValue>(filteredList);
        }

        /// <summary>
        /// Instantiates an EgoCombatValue figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public EgoCombatValue(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Ego Combat Value";
            options["ShortName"] = "ECV";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["BaseValue"] = MixedNumber.From(0);

            // Inject the dynamic cascading base value calculation logic rule array
            options["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                if (parameters.ContainsKey("characterElements") && parameters["characterElements"] is CharacterElements characterElements)
                {
                    var egoCollection = typeof(Ego).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                    var decvCollection = typeof(DefensiveEgoCombatValue).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                    var oecvCollection = typeof(OffensiveEgoCombatValue).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;

                    object egoCharacteristic = egoCollection?.Cast<object>().FirstOrDefault();
                    object decvCharacteristic = decvCollection?.Cast<object>().FirstOrDefault();
                    object oecvCharacteristic = oecvCollection?.Cast<object>().FirstOrDefault();

                    bool hasEgo = egoCharacteristic != null;
                    bool hasDecv = decvCharacteristic != null;
                    bool hasOecv = oecvCharacteristic != null;

                    if (hasEgo || hasDecv || hasOecv)
                    {
                        if (hasDecv && hasOecv)
                        {
                            double decvVal = Convert.ToDouble(decvCharacteristic.GetType().GetMethod("Value")?.Invoke(decvCharacteristic, null));
                            double oecvVal = Convert.ToDouble(oecvCharacteristic.GetType().GetMethod("Value")?.Invoke(oecvCharacteristic, null));

                            return MixedNumber.From(decvVal).Add(oecvVal).Divide(2);
                        }
                        else if (hasDecv)
                        {
                            double decvVal = Convert.ToDouble(decvCharacteristic.GetType().GetMethod("Value")?.Invoke(decvCharacteristic, null));
                            return MixedNumber.From(decvVal);
                        }
                        else if (hasOecv)
                        {
                            double oecvVal = Convert.ToDouble(oecvCharacteristic.GetType().GetMethod("Value")?.Invoke(oecvCharacteristic, null));
                            return MixedNumber.From(oecvVal);
                        }

                        double egoVal = Convert.ToDouble(egoCharacteristic.GetType().GetMethod("Value")?.Invoke(egoCharacteristic, null));
                        return MixedNumber.From(egoVal).Divide(3);
                    }
                }

                throw new InvalidOperationException("Ego Combat Value Base Value requires a valid Ego object");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Ego Combat Value attributes.
    /// </summary>
    public class EgoCombatValues : Collection<EgoCombatValue>
    {
        public EgoCombatValues() : base() { }
        public EgoCombatValues(IEnumerable<EgoCombatValue> items) : base(items) { }
    }
}