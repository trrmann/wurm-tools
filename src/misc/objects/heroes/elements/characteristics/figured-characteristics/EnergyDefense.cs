using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Energy Defense (ED) figured characteristic of an entity,
    /// calculating energy mitigation thresholds directly from Constitution attributes.
    /// </summary>
    public class EnergyDefense : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from EnergyDefense.
        /// </summary>
        public static new Collection<EnergyDefense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<EnergyDefense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is EnergyDefense energyDefenseInstance)
                {
                    filteredList.Add(energyDefenseInstance);
                }
            });

            return new Collection<EnergyDefense>(filteredList);
        }

        /// <summary>
        /// Instantiates an EnergyDefense figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public EnergyDefense(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Energy Defense";
            options["ShortName"] = "ED";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["MaxValue"] = MixedNumber.From(8);
            options["OverMaxValueRate"] = MixedNumber.From(2);
            options["ValueRate"] = MixedNumber.From(1);
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
                        return MixedNumber.From(conVal).Divide(5);
                    }
                }

                throw new InvalidOperationException("Energy Defense Base Value requires a valid Constitution characteristic");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Energy Defense attributes.
    /// </summary>
    public class EnergyDefenseCharacteristics : Collection<EnergyDefense>
    {
        public EnergyDefenseCharacteristics() : base() { }
        public EnergyDefenseCharacteristics(IEnumerable<EnergyDefense> items) : base(items) { }
    }
}
