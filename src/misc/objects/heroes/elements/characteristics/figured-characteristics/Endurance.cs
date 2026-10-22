using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Endurance (END) figured characteristic of an entity,
    /// calculating available energy pools directly from Constitution attributes.
    /// </summary>
    public class Endurance : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Endurance.
        /// </summary>
        public static new Collection<Endurance> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Endurance>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Endurance enduranceInstance)
                {
                    filteredList.Add(enduranceInstance);
                }
            });

            return new Collection<Endurance>(filteredList);
        }

        /// <summary>
        /// Instantiates an Endurance figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public Endurance(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Endurance";
            options["ShortName"] = "END";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["MaxValue"] = MixedNumber.From(50);
            options["OverMaxValueRate"] = MixedNumber.From(2);
            options["ValueRate"] = MixedNumber.From(0.5); // Handled fraction "1/2" as 0.5
            options["BaseValue"] = MixedNumber.From(0);

            // Inject the dynamic base value calculation logic rule array
            options["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                if (parameters.ContainsKey("characterElements") && parameters["characterElements"] is CharacterElements characterElements)
                {
                    var conCollection = typeof(Constitution).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                    object constitutionCharacteristic = conCollection?.Cast<object>().FirstOrDefault();

                    if (constitutionCharacteristic != null)
                    {
                        double conVal = Convert.ToDouble(constitutionCharacteristic.GetType().GetMethod("Value")?.Invoke(constitutionCharacteristic, null));
                        return MixedNumber.From(conVal).Multiply(2);
                    }
                }

                throw new InvalidOperationException("Endurance Base Value requires a valid Constitution characteristic");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Endurance attributes.
    /// </summary>
    public class EnduranceCharacteristics : Collection<Endurance>
    {
        public EnduranceCharacteristics() : base() { }
        public EnduranceCharacteristics(IEnumerable<Endurance> items) : base(items) { }
    }
}
