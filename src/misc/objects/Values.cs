namespace Common.Base
{
    public class Values : Base.Points
    {
        public Values() : base() { }

        public Values(IEnumerable<Base.Point> items) : base(items) { }

        public Base.Value Calculate(Func<Base.Points, object> template)
        {
            if (template == null)
                throw new TypeErrorException("Calculation template must be a function");

            return Base.Value.From(template(this));
        }

        public static Base.Value Calculate(IEnumerable<Base.Point> points, Func<Points, object> template)
        {
            return new Values(points).Calculate(template);
        }
    }
}
