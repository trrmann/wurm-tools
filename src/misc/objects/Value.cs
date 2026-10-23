namespace Common.Base
{
    public class Value : Base.Point
    {
        public Value(object value = null, object numerator = null, object denominator = null)
            : base(0, 0, 1)
        {
            SetValue(numerator == null && denominator == null
                ? MixedNumber.From(value ?? 0)
                : new MixedNumber(value ?? 0, numerator ?? 0, denominator ?? 1));
        }

        public static new Value From(object value)
        {
            return new Value(MixedNumber.From(value));
        }
    }

}
