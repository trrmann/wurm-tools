using System.Collections;

namespace Common.Base
{
    public class Classifiers
    {
        public static List<object> NormalizeValues(object single, object multiple)
        {
            var values = single == null ? new List<object>() : new List<object> { single };
            if (multiple == null) return values;
            if (CollectionOfStrings.IsString(multiple))
            {
                values.Add(multiple.ToString());
                return values;
            }
            if (multiple is IEnumerable enumerable)
            {
                foreach (var item in enumerable) values.Add(item);
                return values;
            }
            values.Add(multiple);
            return values;
        }
    }

}
