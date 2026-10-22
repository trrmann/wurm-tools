using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Defense (DEF) figured characteristic of an entity,
    /// calculating unified defensive thresholds from distinct physical and energy tracks or composition.
    /// </summary>
    public class Defense : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Defense.
        /// </summary>
        public static new Collection<Defense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Defense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Defense defenseInstance)
                {
                    filteredList.Add(defenseInstance);
                }
            });

            return new Collection<Defense>(filteredList);
        }

        /// <summary>
        /// Instantiates a Defense figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public Defense(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Defense";
            options["ShortName"] = "DEF";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["MaxValue"] = null;
            options["OverMaxValueRate"] = MixedNumber.From(2);
            options["ValueRate"] = MixedNumber.From(1);
            options["BaseValue"] = MixedNumber.From(0);

            // Inject the dynamic base value calculation logic rule array
            options["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                object compositionObj = parameters.ContainsKey("Composition") ? parameters["Composition"] : null;
                object characterElementsObj = parameters.ContainsKey("characterElements") ? parameters["characterElements"] : null;

                bool hasCompositionNumber = compositionObj is int || compositionObj is long || compositionObj is double || compositionObj is float || compositionObj is decimal;
                bool hasCharacterElements = characterElementsObj is CharacterElements;

                if (hasCompositionNumber || hasCharacterElements)
                {
                    object physicalDefenseCharacteristic = null;
                    object energyDefenseCharacteristic = null;

                    if (hasCharacterElements)
                    {
                        var characterElements = (CharacterElements)characterElementsObj;
                        var pdCollection = typeof(PhysicalDefense).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                        var edCollection = typeof(EnergyDefense).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;

                        physicalDefenseCharacteristic = pdCollection?.Cast<object>().FirstOrDefault();
                        energyDefenseCharacteristic = edCollection?.Cast<object>().FirstOrDefault();
                    }

                    bool hasPd = physicalDefenseCharacteristic != null;
                    bool hasEd = energyDefenseCharacteristic != null;

                    if (hasPd && hasEd)
                    {
                        double pdVal = Convert.ToDouble(physicalDefenseCharacteristic.GetType().GetMethod("Value")?.Invoke(physicalDefenseCharacteristic, null));
                        double edVal = Convert.ToDouble(energyDefenseCharacteristic.GetType().GetMethod("Value")?.Invoke(energyDefenseCharacteristic, null));

                        return MixedNumber.From(pdVal).Add(MixedNumber.From(edVal)).Divide(2);
                    }
                    else if (hasPd)
                    {
                        double pdVal = Convert.ToDouble(physicalDefenseCharacteristic.GetType().GetMethod("Value")?.Invoke(physicalDefenseCharacteristic, null));
                        return MixedNumber.From(pdVal);
                    }
                    else if (hasEd)
                    {
                        double edVal = Convert.ToDouble(energyDefenseCharacteristic.GetType().GetMethod("Value")?.Invoke(energyDefenseCharacteristic, null));
                        return MixedNumber.From(edVal);
                    }
                    else
                    {
                        return compositionObj ?? MixedNumber.From(0);
                    }
                }

                throw new InvalidOperationException("Defense Base Value requires either a valid Physical Defense object, Energy Defense objects, or Composition numeric value");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Defense attributes.
    /// </summary>
    public class DefenseCharacteristics : Collection<Defense>
    {
        public DefenseCharacteristics() : base() { }
        public DefenseCharacteristics(IEnumerable<Defense> items) : base(items) { }
    }
}
