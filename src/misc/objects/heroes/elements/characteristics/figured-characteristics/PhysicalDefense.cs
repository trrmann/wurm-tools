using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Physical Defense (PD) figured characteristic of a living entity,
    /// calculating base defensive metrics from the underlying Strength attribute.
    /// </summary>
    public class PhysicalDefense : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from PhysicalDefense.
        /// </summary>
        public static new Collection<PhysicalDefense> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<PhysicalDefense>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is PhysicalDefense pdInstance)
                {
                    filteredList.Add(pdInstance);
                }
            });

            return new Collection<PhysicalDefense>(filteredList);
        }

        /// <summary>
        /// Instantiates a PhysicalDefense figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public PhysicalDefense(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Physical Defense";
            options["ShortName"] = "PD";
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
                    var strCollection = typeof(Strength).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                    object strengthCharacteristic = strCollection?.Cast<object>().FirstOrDefault();

                    if (strengthCharacteristic != null)
                    {
                        double strVal = Convert.ToDouble(strengthCharacteristic.GetType().GetMethod("Value")?.Invoke(strengthCharacteristic, null));
                        return MixedNumber.From(strVal).Divide(5);
                    }
                }

                throw new InvalidOperationException("Physical Defense Base Value requires a valid Strength object");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of PhysicalDefense attributes.
    /// </summary>
    public class PhysicalDefenseCharacteristics : Collection<PhysicalDefense>
    {
        public PhysicalDefenseCharacteristics() : base() { }
        public PhysicalDefenseCharacteristics(IEnumerable<PhysicalDefense> items) : base(items) { }
    }
}
