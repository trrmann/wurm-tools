using System.Collections.ObjectModel;
using System.Numerics;
using Common.Base;

namespace Heros.Base
{
    /// <summary>
    /// Replicates the mathematical calculations, options parameterization, 
    /// and rounding algorithms of the Heros game calculation model.
    /// </summary>
    public class HerosValue : Common.Base.Value
    {
        // Parameter tracking properties mirroring JS assignment layout
        public Common.Base.MixedNumber AbsoluteMinValue { get; set; }
        public Common.Base.MixedNumber AbsoluteMaxValue { get; set; }
        public Common.Base.MixedNumber MinValue { get; set; }
        public Common.Base.MixedNumber MaxValue { get; set; }
        public Common.Base.MixedNumber UnderMinValueRate { get; set; }
        public Common.Base.MixedNumber OverMaxValueRate { get; set; }
        public Common.Base.MixedNumber ValueRate { get; set; }
        public Common.Base.MixedNumber BaseValue { get; set; }
        public Common.Base.MixedNumber Points { get; set; }
        public Func<IDictionary<string, object>, object> BaseValueFunction { get; set; }
        public Collection<object> OptionFlagCollection { get; set; }
        public Func<IDictionary<string, object>, object> ValueFunction { get; set; }
        public Common.Base.MixedNumber UnroundedValue { get; set; }
        public string RoundingMode { get; set; }
        public object CharacterElements { get; set; }
        public object Composition { get; set; }

        private static Common.Base.MixedNumber OptionalMixedNumber(object value)
        {
            return value == null ? null : Common.Base.MixedNumber.From(value);
        }

        private static Common.Base.MixedNumber RoundValue(Common.Base.MixedNumber value, string mode)
        {
            if (string.IsNullOrEmpty(mode) || mode == "none") return value;

            string[] parts = value.ToImproperString().Split('/');
            BigInteger top = BigInteger.Parse(parts[0]);
            BigInteger bottom = parts.Length > 1 ? BigInteger.Parse(parts[1]) : 1;

            BigInteger quotient = top / bottom;
            BigInteger remainder = top % bottom;

            if (mode == "toward-zero") return Common.Base.MixedNumber.FromImproper(quotient, 1);

            BigInteger floor = (top < 0 && remainder != 0) ? quotient - 1 : quotient;
            if (mode == "down") return Common.Base.MixedNumber.FromImproper(floor, 1);
            if (mode == "up")
            {
                return Common.Base.MixedNumber.FromImproper((top > 0 && remainder != 0) ? quotient + 1 : quotient, 1);
            }
            if (mode != "nearest") throw new ArgumentOutOfRangeException(nameof(mode), $"Unsupported rounding mode: {mode}");

            BigInteger fractionalNumerator = top - (floor * bottom);
            return Common.Base.MixedNumber.FromImproper((fractionalNumerator * 2 >= bottom) ? floor + 1 : floor, 1);
        }

        public HerosValue(IDictionary<string, object> options = null) : base(0, 0, 1)
        {
            options ??= new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            Func<string[], object> getAltKey = (keys) => {
                foreach (var k in keys) if (options.ContainsKey(k)) return options[k];
                return null;
            };

            // Setup default callback if none was injected
            Func<IDictionary<string, object>, object> calculateValue = (parameters) => {
                var bv = parameters["BaseValue"] as Common.Base.MixedNumber;
                var pts = parameters["Points"] as Common.Base.MixedNumber;
                var vr = parameters["ValueRate"] as Common.Base.MixedNumber;
                return vr == null ? bv : bv.Add(pts.Divide(vr));
            };

            if (options.ContainsKey("ValueFunction") && options["ValueFunction"] != null)
            {
                calculateValue = options["ValueFunction"] as Func<IDictionary<string, object>, object> 
                    ?? throw new InvalidCastException("ValueFunction must be a valid functional delegate.");
            }

            if (options.ContainsKey("BaseValueFunction") && options["BaseValueFunction"] != null)
            {
                this.BaseValueFunction = options["BaseValueFunction"] as Func<IDictionary<string, object>, object>
                    ?? throw new InvalidCastException("BaseValueFunction must be a valid functional delegate.");
            }

            // Initialize collection element containers
            var flagsInput = options.ContainsKey("OptionFlagCollection") ? options["OptionFlagCollection"] : null;
            var flags = new Collection<object>();
            if (flagsInput != null)
            {
                if (flagsInput is System.Collections.IEnumerable enumerable)
                {
                    foreach (var item in enumerable) flags.Add(item);
                }
                else
                {
                    flags.Add(flagsInput);
                }
            }

            this.AbsoluteMinValue = OptionalMixedNumber(getAltKey(new[] { "AbsoluteMinValue", "absoluteMinValue" }));
            this.AbsoluteMaxValue = OptionalMixedNumber(getAltKey(new[] { "AbsoluteMaxValue", "absoluteMaxValue" }));
            this.MinValue = OptionalMixedNumber(getAltKey(new[] { "MinValue" }));
            this.MaxValue = OptionalMixedNumber(getAltKey(new[] { "MaxValue" }));
            this.UnderMinValueRate = OptionalMixedNumber(getAltKey(new[] { "UnderMinValueRate" }));
            this.OverMaxValueRate = OptionalMixedNumber(getAltKey(new[] { "OverMaxValueRate" }));
            this.ValueRate = OptionalMixedNumber(getAltKey(new[] { "ValueRate" })) ?? Common.Base.MixedNumber.From(0);
            this.BaseValue = OptionalMixedNumber(getAltKey(new[] { "BaseValue" })) ?? Common.Base.MixedNumber.From(0);
            this.Points = Common.Base.MixedNumber.From(options.ContainsKey("Points") ? options["Points"] : 0);
            this.OptionFlagCollection = flags;
            this.CharacterElements = options.ContainsKey("characterElements") ? options["characterElements"] : null;
            this.Composition = options.ContainsKey("Composition") ? options["Composition"] : null;
            this.RoundingMode = options.ContainsKey("RoundingMode") ? options["RoundingMode"]?.ToString() : "none";
            this.ValueFunction = calculateValue;

            // Prepare local parameter block for execution contexts
            var parameters = new Dictionary<string, object>
            {
                { "absoluteMinValue", this.AbsoluteMinValue },
                { "absoluteMaxValue", this.AbsoluteMaxValue },
                { "MinValue", this.MinValue },
                { "MaxValue", this.MaxValue },
                { "UnderMinValueRate", this.UnderMinValueRate },
                { "OverMaxValueRate", this.OverMaxValueRate },
                { "ValueRate", this.ValueRate },
                { "BaseValue", this.BaseValue },
                { "Points", this.Points },
                { "BaseValueFunction", this.BaseValueFunction },
                { "OptionFlagCollection", this.OptionFlagCollection },
                { "characterElements", this.CharacterElements },
                { "Composition", this.Composition }
            };

            // Execute the base modifier pipeline if bounded
            if (this.BaseValueFunction != null)
            {
                var readOnlyParams = new ReadOnlyDictionary<string, object>(parameters);
                this.BaseValue = Common.Base.MixedNumber.From(this.BaseValueFunction(readOnlyParams));
                parameters["BaseValue"] = this.BaseValue;
            }

            var runtimeParams = new ReadOnlyDictionary<string, object>(parameters);
            var result = Common.Base.MixedNumber.From(this.ValueFunction(runtimeParams));
            this.UnroundedValue = result;

            // Complete downstream rounding execution shifts
            var roundedResult = RoundValue(result, this.RoundingMode);

            // Access private fields of MixedNumber base via structural reflection mechanics
            var numField = typeof(Common.Base.MixedNumber).GetField("_numerator", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var denField = typeof(Common.Base.MixedNumber).GetField("_denominator", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            
            if (numField != null && denField != null)
            {
                numField.SetValue(this.BaseValue, roundedResult.WholeBigInt);
                denField.SetValue(this.BaseValue, roundedResult.DenominatorBigInt);
            }
        }
    }
}
