namespace Common.Base
{
    public class Point : Base.MixedNumber
    {
        // Inherits all algebraic, parsing, and numeric representation behaviors from MixedNumber
        public Point(object whole = null, object numerator = null, object denominator = null) 
            : base(whole, numerator, denominator) { }
    }

}
