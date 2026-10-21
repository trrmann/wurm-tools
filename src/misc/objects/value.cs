namespace Common.Base
{
    public class Value : Base.Point
    {
        public Value(object value = null, object numerator = null, object denominator = null)
            : base(value ?? 0, numerator ?? 0, denominator ?? 1) { }

        // Overload handling the single-argument object conversion constructor path
        public Value(object valueObj) : base(0, 0, 1)
        {
            if (valueObj == null) throw new ArgumentNullException(nameof(valueObj));
            
            MixedNumber mixedNumber = MixedNumber.From(valueObj);
            
            // Set fields using reflection or expose a protected/public structural setter on MixedNumber if fields are private
            var numField = typeof(MixedNumber).GetField("_numerator", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var denField = typeof(MixedNumber).GetField("_denominator", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            
            if (numField != null && denField != null)
            {
                numField.SetValue(this, mixedNumber.WholeBigInt);
                denField.SetValue(this, mixedNumber.DenominatorBigInt);
            }
        }

        public static new Value From(object value)
        {
            return new Value(MixedNumber.From(value));
        }
    }

}
