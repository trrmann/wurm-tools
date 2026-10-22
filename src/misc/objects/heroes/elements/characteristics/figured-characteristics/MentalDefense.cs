using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    // this still needs to be designated as non-standard
    /// <summary>
    /// Represents the Mental Defense (MD) figured characteristic of an entity,
    /// calculating psychic shielding thresholds directly from Ego attributes.
    /// </summary>
    public class MentalDefense : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from MentalDefense.
        /// </summary>
        public static new Collection<MentalDefense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<MentalDefense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is MentalDefense mentalDefenseInstance)
                {
                    filteredList.Add(mentalDefenseInstance);
                }
            });

            return new Collection<MentalDefense>(filteredList);
        }

        /// <summary>
        /// Instantiates a MentalDefense figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public MentalDefense(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Mental Defense";
            options["ShortName"] = "MD";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["AbsoluteMaxValue"] = MixedNumber.From(-1);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["MaxValue"] = MixedNumber.From(50);
            options["OverMaxValueRate"] = MixedNumber.From(2);
            options["ValueRate"] = MixedNumber.From(1);
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
                        return MixedNumber.From(egoVal).Divide(5);
                    }
                }

                throw new InvalidOperationException("Mental Defense Base Value requires a valid Ego characteristic");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Mental Defense attributes.
    /// </summary>
    public class MentalDefenseCharacteristics : Collection<MentalDefense>
    {
        public MentalDefenseCharacteristics() : base() { }
        public MentalDefenseCharacteristics(IEnumerable<MentalDefense> items) : base(items) { }
    }
}
