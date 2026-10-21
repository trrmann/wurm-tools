namespace Common.Base
{

    public class Points : Base.CollectionOfNumbers<Base.Point>
    {
        public Points() : base() { }

        public Points(IEnumerable<Base.Point> items) : base(items) { }
    }
}
