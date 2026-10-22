using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Recovery (REC) figured characteristic of a living entity,
    /// calculating resource regeneration capabilities from Strength and Constitution attributes.
    /// </summary>
    public class Recovery : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Recovery.
        /// </summary>
        public static new Collection<Recovery> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Recovery>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Recovery recoveryInstance)
                {
                    filteredList.Add(recoveryInstance);
                }
            });

            return new Collection<Recovery>(filteredList);
        }

        /// <summary>
        /// Instantiates a Recovery figured characteristic mapping system cost parameters and dynamic dependency fallbacks.
        /// </summary>
        public Recovery(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
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
            options["Name"] = "Recovery";
            options["ShortName"] = "REC";
            options["AbsoluteMinValue"] = MixedNumber.From(0);
            options["MinValue"] = MixedNumber.From(0);
            options["UnderMinValueRate"] = MixedNumber.From(0);
            options["MaxValue"] = MixedNumber.From(10);
            options["OverMaxValueRate"] = MixedNumber.From(2);
            options["ValueRate"] = MixedNumber.From(2);
            options["BaseValue"] = MixedNumber.From(0);

            // Inject the dynamic base value calculation logic rule array
            options["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                if (parameters.ContainsKey("characterElements") && parameters["characterElements"] is CharacterElements characterElements)
                {
                    var conCollection = typeof(Constitution).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;
                    var strCollection = typeof(Strength).GetMethod("Filter")?.Invoke(null, new object[] { characterElements }) as IEnumerable<object>;

                    object constitutionCharacteristic = conCollection?.Cast<object>().FirstOrDefault();
                    object strengthCharacteristic = strCollection?.Cast<object>().FirstOrDefault();

                    bool hasStr = strengthCharacteristic != null;
                    bool hasCon = constitutionCharacteristic != null;

                    if (hasStr && hasCon)
                    {
                        double strVal = Convert.ToDouble(strengthCharacteristic.GetType().GetMethod("Value")?.Invoke(strengthCharacteristic, null));
                        double conVal = Convert.ToDouble(constitutionCharacteristic.GetType().GetMethod("Value")?.Invoke(constitutionCharacteristic, null));

                        return MixedNumber.From(strVal).Add(MixedNumber.From(conVal)).Divide(5);
                    }
                    else if (hasStr)
                    {
                        double strVal = Convert.ToDouble(strengthCharacteristic.GetType().GetMethod("Value")?.Invoke(strengthCharacteristic, null));
                        return MixedNumber.From(strVal).Divide(5);
                    }
                    else if (hasCon)
                    {
                        double conVal = Convert.ToDouble(constitutionCharacteristic.GetType().GetMethod("Value")?.Invoke(constitutionCharacteristic, null));
                        return MixedNumber.From(conVal).Divide(5);
                    }
                }

                throw new InvalidOperationException("Recovery Base Value requires valid Strength and Constitution objects");
            });

            return options;
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Recovery attributes.
    /// </summary>
    public class RecoveryCharacteristics : Collection<Recovery>
    {
        public RecoveryCharacteristics() : base() { }
        public RecoveryCharacteristics(IEnumerable<Recovery> items) : base(items) { }
    }
}
