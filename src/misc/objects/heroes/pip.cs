namespace Heros.Base
{
    /// <summary>
    /// A non-negative fractional point value smaller than one whole point.
    /// </summary>
    public class Pip : MixedNumber
    {
        // Parameterless or multi-argument constructor options matching your JS conditions
        public Pip(object value = null, object numerator = null, object denominator = null)
            : base(GetInitialValue(value, numerator, denominator), numerator ?? 0, denominator ?? 1)
        {
            // If it was a single object constructor initialization path, extract properties via reflection
            if (numerator == null && denominator == null && value != null && !CollectionOfStrings.IsString(value) && !(value is ValueType))
            {
                MixedNumber mixedNumber = MixedNumber.From(value);
                
                var numField = typeof(MixedNumber).GetField("_numerator", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var denField = typeof(MixedNumber).GetField("_denominator", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                
                if (numField != null && denField != null)
                {
                    numField.SetValue(this, mixedNumber.WholeBigInt);
                    denField.SetValue(this, mixedNumber.DenominatorBigInt);
                }
            }

            // Enforce structural fractional limit constraints: [0, 1)
            if (this.Compare(0) < 0 || this.Compare(1) >= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "Pip must be at least zero and less than one");
            }
        }

        private static object GetInitialValue(object value, object numerator, object denominator)
        {
            if (numerator == null && denominator == null && value != null && !CollectionOfStrings.IsString(value) && !(value is ValueType))
            {
                return 0; // Handled by object reflection inside constructor body
            }
            return value ?? 0;
        }

        public static new Pip From(object value)
        {
            MixedNumber mixedNumber = MixedNumber.From(value);
            return new Pip(mixedNumber.WholeBigInt, mixedNumber.NumeratorBigInt, mixedNumber.DenominatorBigInt);
        }

        /// <summary>
        /// Appends this fractional Pip value to a target point metric.
        /// </summary>
        public MixedNumber ApplyTo(Point point)
        {
            if (point == null) throw new TypeErrorException("Pip can only be applied to a Point");
            return point.Add(this);
        }
    }
}
