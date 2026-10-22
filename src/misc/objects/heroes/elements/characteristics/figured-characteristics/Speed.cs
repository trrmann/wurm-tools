using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    /// <summary>
    /// Represents the Speed figured characteristic, which determines tactical action phases 
    /// calculated dynamically from character Dexterity elements.
    /// </summary>
    public class Speed : FiguredCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Speed.
        /// </summary>
        public static new Collection<Speed> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Speed>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Speed speedInstance)
                {
                    filteredList.Add(speedInstance);
                }
            });

            return new Collection<Speed>(filteredList);
        }

        /// <summary>
        /// Instantiates a Speed characteristic mapping, assigning calculated baselines 
        /// from the dependent Dexterity elements.
        /// </summary>
        public Speed(IDictionary<string, object> options = null) : base(NormalizeOptions(options))
        {
        }

        private static IDictionary<string, object> NormalizeOptions(IDictionary<string, object> options)
        {
            // Set required defaults for base class parsing pipelines
            var baseOptions = options == null
                ? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, object>(options, StringComparer.OrdinalIgnoreCase);
            baseOptions["AbsoluteMinValue"] = "0";
            baseOptions["MinValue"] = "0";
            baseOptions["UnderMinValueRate"] = "0";
            baseOptions["MaxValue"] = "4";
            baseOptions["OverMaxValueRate"] = "2";
            baseOptions["ValueRate"] = "10";
            baseOptions["RoundingMode"] = "down";
            baseOptions["Name"] = "Speed";
            baseOptions["ShortName"] = "SPD";

            // Configure dynamic baseline generator function tracking standard Hero rules
            baseOptions["BaseValueFunction"] = new Func<IDictionary<string, object>, object>((parameters) =>
            {
                var elements = parameters.ContainsKey("characterElements") ? parameters["characterElements"] as CharacterElements : null;
                if (elements != null)
                {
                    // Locate parent Dexterity components dynamically using the shared cross-module filter hook
                    var dexCollection = Dexterity.Filter(elements);
                    var dexterityCharacteristic = dexCollection.Count > 0 ? dexCollection[0] : null;

                    if (dexterityCharacteristic is Dexterity)
                    {
                        return MixedNumber.From(1).Add(
                            MixedNumber.From(dexterityCharacteristic.Value()).Divide(MixedNumber.From(10))
                        );
                    }
                }
                throw new InvalidOperationException("Speed Base Value requires a valid Dexterity object");
            });
            return baseOptions;
        }

        /// <summary>
        /// Resolves the tactical combat turn phase segments matching standard system speed matrices.
        /// </summary>
        public int[] Phases()
        {
            int speedValue = (int)Math.Floor(this.Value());
            switch (speedValue)
            {
                case 1:
                    return new int[] { 7 };
                case 2:
                    return new int[] { 6, 12 };
                case 3:
                    return new int[] { 4, 8, 12 };
                case 4:
                    return new int[] { 3, 6, 9, 12 };
                case 5:
                    return new int[] { 3, 5, 8, 10, 12 };
                case 6:
                    return new int[] { 2, 4, 6, 8, 10, 12 };
                case 7:
                    return new int[] { 2, 4, 6, 7, 9, 11, 12 };
                case 8:
                    return new int[] { 2, 3, 5, 6, 8, 9, 11, 12 };
                case 9:
                    return new int[] { 2, 3, 4, 6, 7, 8, 10, 11, 12 };
                case 10:
                    return new int[] { 2, 3, 4, 5, 6, 8, 9, 10, 11, 12 };
                case 11:
                    return new int[] { 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 };
                case 12:
                    return new int[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 };
                default:
                    return Array.Empty<int>();
            }
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of speed characteristics.
    /// </summary>
    public class SpeedCharacteristics : Collection<Speed>
    {
        public SpeedCharacteristics() : base() { }
        public SpeedCharacteristics(IEnumerable<Speed> items) : base(items) { }
    }
}