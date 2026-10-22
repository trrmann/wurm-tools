namespace Heros.Base
{
    /// <summary>
    /// Specialized collection wrapper for managing portfolios of primary attributes.
    /// </summary>
    public class Characteristics : Collection<Characteristic>
    {
        public Characteristics() : base() { }

        public Characteristics(IEnumerable<Characteristic> items) : base(items) { }
    }
}
