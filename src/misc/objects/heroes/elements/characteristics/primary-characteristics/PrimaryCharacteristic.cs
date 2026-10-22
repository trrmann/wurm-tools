using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Serves as the structural parent for core stats, mapping base boundaries and standard roll formulas.
    /// </summary>
    public class PrimaryCharacteristic : Characteristic
    {
        private static readonly HashSet<string> StandardRollAttributes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "STR", "DEX", "CON", "BODY", "INT", "EGO", "PRE", "COM"
        };

        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from PrimaryCharacteristic.
        /// </summary>
        public static new Collection<PrimaryCharacteristic> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<PrimaryCharacteristic>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is PrimaryCharacteristic primaryInstance)
                {
                    filteredList.Add(primaryInstance);
                }
            });

            return new Collection<PrimaryCharacteristic>(filteredList);
        }

        /// <summary>
        /// Instantiates a PrimaryCharacteristic mapping standard Hero System rule caps and multipliers.
        /// </summary>
        public PrimaryCharacteristic(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
        {
        }

        protected static IDictionary<string, object> ConfigureOptions(
            IDictionary<string, object> options, string name, string shortName, string valueRate)
        {
            var configured = options == null
                ? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(options, StringComparer.OrdinalIgnoreCase);
            configured["Name"] = name;
            configured["ShortName"] = shortName;
            configured["ValueRate"] = valueRate;
            return configured;
        }

        private static IDictionary<string, object> NormalizeOptions(IDictionary<string, object> options)
        {
            var normalized = options != null
                ? new Dictionary<string, object>(options, StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            // Inject the strict system baseline constants found in the JS blueprint
            if (!normalized.ContainsKey("Points")) normalized["Points"] = 0;
            normalized["MinValue"] = "1";
            normalized["UnderMinValueRate"] = "0";
            normalized["MaxValue"] = "20";
            normalized["OverMaxValueRate"] = "2";
            if (!normalized.ContainsKey("BaseValue")) normalized["BaseValue"] = "10";
            normalized["RoundingMode"] = normalized.ContainsKey("RoundingMode") ? normalized["RoundingMode"] : "nearest";
            normalized["Name"] = normalized.ContainsKey("Name") ? normalized["Name"] : "Primary Characteristic";
            normalized["ShortName"] = normalized.ContainsKey("ShortName") ? normalized["ShortName"] : "PCHR";

            // BaseValueFunction context mapping: ({ BaseValue }) => BaseValue
            Func<IDictionary<string, object>, object> baseValFunc = (paramsBlock) =>
            {
                return paramsBlock.ContainsKey("BaseValue") ? paramsBlock["BaseValue"] : "10";
            };
            normalized["BaseValueFunction"] = baseValFunc;
            normalized["OptionFlagCollection"] = new Dictionary<string, object>();

            return normalized;
        }

        /// <summary>
        /// Calculates the base target threshold for a characteristic check roll.
        /// </summary>
        public int CharacteristicRoll()
        {
            if (StandardRollAttributes.Contains(this.ShortName))
            {
                return this.RollTarget;
            }
            return 0;
        }

        /// <summary>
        /// Calculates the effective runtime target threshold including short-term stat adjustments.
        /// </summary>
        public int EffectiveCharacteristicRoll()
        {
            if (this.CharacteristicRoll() > 0.0)
            {
                return this.EffectiveRollTarget;
            }
            return 0;
        }
    }

    /// <summary>
    /// Specialized collection holding PrimaryCharacteristic elements.
    /// </summary>
    public class PrimaryCharacteristics : Collection<PrimaryCharacteristic>
    {
        public PrimaryCharacteristics() : base() { }
        public PrimaryCharacteristics(IEnumerable<PrimaryCharacteristic> items) : base(items) { }
    }
}
