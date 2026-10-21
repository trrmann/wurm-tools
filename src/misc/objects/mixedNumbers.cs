namespace Common.Base
{
    /// <summary>
    /// An immutable, reduced rational number with mixed-number parsing and display.
    /// </summary>
    public class MixedNumbers : Base.CollectionOfNumbers
    {
        public MixedNumbers() : base() { }
        public MixedNumbers(System.Collections.Generic.IEnumerable items) : base(items) { }
    }
}