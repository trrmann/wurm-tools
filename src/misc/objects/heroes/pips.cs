using Common.Base;

namespace Heros.Base
{
    /// <summary>
    /// Collection holding Pip elements extending the base numeric collection patterns.
    /// </summary>
    public class Pips : Common.Base.CollectionOfNumbers<Base.Pip>
    {
        public static bool IsNumeric(object value)
        {
            return value is Pip;
        }

        public Pips() : base() { }

        public Pips(object values) : base()
        {
            if (values == null) return;

            if (values is int capacity && capacity >= 0)
            {
                this.Capacity = capacity;
            }
            else if (IsNumeric(values))
            {
                this.Add((Pip)values);
            }
            else if (values is IEnumerable enumerable)
            {
                foreach (var item in enumerable)
                {
                    if (!IsNumeric(item))
                        throw new TypeErrorException("Collection only accepts values of Pip element types");
                        
                    this.Add((Pip)item);
                }
            }
            else
            {
                throw new TypeErrorException("Pips must be constructed from Pip values or an iterable of Pips");
            }
        }
    }
}
