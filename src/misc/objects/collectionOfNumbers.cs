namespace Common.Base
{
  public class CollectionOfNumbers<T> : Base.Collection<T> where T : struct, IComparable
  {
    public CollectionOfNumbers() : base() { }

    public CollectionOfNumbers(IEnumerable<T> items) : base(items) { }

    public static int CompareValues(T left, T right)
    {
      return left.CompareTo(right);
    }

    private static double ToDouble(T value) => Convert.ToDouble(value);
    private static T FromDouble(double value) => (T)Convert.ChangeType(value, typeof(T));

    public T Aggregate(Func<T, T, T> reducer)
    {
      if (this.IsEmpty) throw new InvalidOperationException("Sequence contains no elements");
      return this.Skip(1).Aggregate(this[0], reducer);
    }

    public T Aggregate(Func<T, T, T> reducer, T initialValue)
    {
      return base.Aggregate(initialValue, reducer);
    }

    public T Sum()
    {
      if (this.IsEmpty) return default;
      double total = 0;
      foreach (var val in this) total += ToDouble(val);
      return FromDouble(total);
    }

    public double Average()
    {
      if (this.IsEmpty) throw new InvalidOperationException("Cannot average an empty collection");
      return ToDouble(this.Sum()) / this.Count;
    }

    public T Min()
    {
      if (this.IsEmpty) throw new InvalidOperationException("Collection is empty");
      return this.Aggregate((min, val) => CompareValues(val, min) < 0 ? val : min);
    }

    public T Max()
    {
      if (this.IsEmpty) throw new InvalidOperationException("Collection is empty");
      return this.Aggregate((max, val) => CompareValues(val, max) > 0 ? val : max);
    }

    public double Median()
    {
      if (this.IsEmpty) throw new InvalidOperationException("Cannot find the median of an empty collection");
      var sorted = this.OrderBy(x => x).ToList();
      int middle = sorted.Count / 2;
      if (sorted.Count % 2 == 1) return ToDouble(sorted[middle]);
      return (ToDouble(sorted[middle - 1]) + ToDouble(sorted[middle])) / 2.0;
    }

    public T Mode()
    {
      if (this.IsEmpty) throw new InvalidOperationException("Collection is empty");
      return this.GroupBy(x => x).OrderByDescending(g => g.Count()).First().Key;
    }
    public double Variance(bool sample = false)
    {
      int divisor = this.Count - (sample ? 1 : 0);
      if (divisor <= 0) throw new InvalidOperationException("Not enough values to calculate variance");
      double avg = this.Average();
      double sumOfSquares = this.Sum(val => Math.Pow(ToDouble(val) - avg, 2));
      return sumOfSquares / divisor;
    }
    public double StandardDeviation(bool sample = false)
    {
      return Math.Sqrt(this.Variance(sample));
    }
    public CollectionOfNumbers Scale(T factor)
    {
      return this.MultiplyScalar(factor);
    }
    public CollectionOfNumbers AddScalar(T value)
    {
      return this.Transform((item, idx, coll) => FromDouble(ToDouble(item) + ToDouble(value)));
    }
    public CollectionOfNumbers SubtractScalar(T value)
    {
      return this.Transform((item, idx, coll) => FromDouble(ToDouble(item) - ToDouble(value)));
    }
    public CollectionOfNumbers MultiplyScalar(T value)
    {
      return this.Transform((item, idx, coll) => FromDouble(ToDouble(item) * ToDouble(value)));
    }
    public CollectionOfNumbers DivideScalar(T value)
    {
      if (ToDouble(value) == 0.0) throw new DivideByZeroException();
      return this.Transform((item, idx, coll) => FromDouble(ToDouble(item) / ToDouble(value)));
    }
    public CollectionOfNumbers Transform(Func<T, int, CollectionOfNumbers, T> operation)
    {
      if (operation == null) throw new ArgumentNullException(nameof(operation));
      var result = new CollectionOfNumbers<T>();
      for (int i = 0; i < this.Count; i++)
      {
        result.Add(operation(this[i], i, result));
      }
      return result;
    }
    public CollectionOfNumbers<T> Normalize(double minimum = 0.0, double maximum = 1.0)
    {
      if (minimum > maximum) throw new ArgumentOutOfRangeException(nameof(minimum), "Normalization bounds error");
      var result = new CollectionOfNumbers<T>();
      if (this.IsEmpty) return result;
      double srcMin = ToDouble(this.Min());
      double srcMax = ToDouble(this.Max());
      if (Math.Abs(srcMin - srcMax) < double.Epsilon)
      {
        result.AddRange(Enumerable.Repeat(minimum, this.Count));
        return result;
      }
      foreach (var val in this)
      {
        double norm = minimum + ((ToDouble(val) - srcMin) / (srcMax - srcMin)) * (maximum - minimum);
        result.Add(norm);
      }
      return result;
    }
    public CollectionOfNumbers<T> AddEach(IEnumerable other)
    {
      return this.CombineEach(other, (l, r) => FromDouble(ToDouble(l) + ToDouble(r)));
    }
    public CollectionOfNumbers<T> SubtractEach(IEnumerable other)
    {
      return this.CombineEach(other, (l, r) => FromDouble(ToDouble(l) - ToDouble(r)));
    }
    public CollectionOfNumbers<T> MultiplyEach(IEnumerable other)
    {
      return this.CombineEach(other, (l, r) => FromDouble(ToDouble(l) * ToDouble(r)));
    }
    public CollectionOfNumbers<T> DivideEach(IEnumerable other)
    {
      return this.CombineEach(other, (l, r) =>
      {
        if (ToDouble(r) == 0.0) throw new DivideByZeroException();
        return FromDouble(ToDouble(l) / ToDouble(r));
      });
    }
    public T Dot(IEnumerable other)
    {
      return this.MultiplyEach(other).Sum();
    }
    public CollectionOfNumbers<T> CombineEach(IEnumerable other, Func<T, T, T> operation)
    {
      if (other == null) throw new ArgumentNullException(nameof(other));
      var otherList = other.ToList();
      if (otherList.Count != this.Count) throw new ArgumentException("Collections must have equal lengths");
      var result = new CollectionOfNumbers<T>();
      for (int i = 0; i < this.Count; i++)
      {
        result.Add(operation(this[i], otherList[i]));
      }
      return result;
    }
  }
}
