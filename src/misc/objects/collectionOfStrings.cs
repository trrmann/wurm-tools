namespace Common.Base
{
  public class CollectionOfStrings : Base.Collection<string>
  {
    public CollectionOfStrings() : base() { }
    public CollectionOfStrings(IEnumerable<string> items) : base(items) { }
    public string Join(string separator = ",")
    {
      return string.Join(separator, this);
    }
    public CollectionOfStrings Split(string separator, int? limit = null)
    {
      var pieces = new CollectionOfStrings();
      foreach (var val in this)
      {
        var splitArr = val.Split(new[] { separator }, StringSplitOptions.None);
        pieces.AddRange(limit.HasValue ? splitArr.Take(limit.Value) : splitArr);
      }
      return pieces;
    }
    public CollectionOfStrings SplitEach(string separator, int? limit = null)
    {
      return this.Split(separator, limit);
    }
    public CollectionOfStrings SortLocale(CultureInfo culture, bool ignoreCase = false)
    {
      var comp = StringComparer.Create(culture ?? CultureInfo.CurrentCulture, ignoreCase);
      this.Sort(comp);
      return this;
    }
    public CollectionOfStrings SortNatural(CultureInfo culture = null)
    {
      this.Sort((left, right) =>
      {
        return NativeNaturalCompare(left, right, culture);
      });
      return this;
    }
    public CollectionOfStrings SortIgnoreCase(CultureInfo culture = null)
    {
      return this.SortLocale(culture, true);
    }
    public CollectionOfStrings Lowercase(CultureInfo culture = null)
    {
      var targetCulture = culture ?? CultureInfo.CurrentCulture;
      return new CollectionOfStrings(this.Select(x => x.ToLower(targetCulture)));
    }
    public CollectionOfStrings Uppercase(CultureInfo culture = null)
    {
      var targetCulture = culture ?? CultureInfo.CurrentCulture;
      return new CollectionOfStrings(this.Select(x => x.ToUpper(targetCulture)));
    }
    public CollectionOfStrings TrimAll()
    {
      return new CollectionOfStrings(this.Select(x => x.Trim()));
    }
    public CollectionOfStrings FilterStartsWith(string prefix, bool caseInsensitive = false, CultureInfo culture = null)
    {
      var comp = caseInsensitive
      ? StringComparison.Create(culture ?? CultureInfo.CurrentCulture, true)
      : StringComparison.CurrentCulture;
      return new CollectionOfStrings(this.Where(x => x != null && x.StartsWith(prefix, comp)));
    }
    public CollectionOfStrings FilterEndsWith(string suffix, bool caseInsensitive = false, CultureInfo culture = null)
    {
      var comp = caseInsensitive
      ? StringComparison.Create(culture ?? CultureInfo.CurrentCulture, true)
      : StringComparison.CurrentCulture;
      return new CollectionOfStrings(this.Where(x => x != null && x.EndsWith(suffix, comp)));
    }
    public CollectionOfStrings FilterContains(string substring, bool caseInsensitive = false, CultureInfo culture = null)
    {
      var comp = caseInsensitive
      ? StringComparison.Create(culture ?? CultureInfo.CurrentCulture, true)
      : StringComparison.CurrentCulture;
      return new CollectionOfStrings(this.Where(x => x != null && x.Contains(substring, comp)));
    }
    public CollectionOfStrings FilterRegex(Regex pattern)
    {
      if (pattern == null) throw new ArgumentNullException(nameof(pattern));
      return new CollectionOfStrings(this.Where(x => x != null && pattern.IsMatch(x)));
    }
    public CollectionOfStrings Unique(bool caseInsensitive = false, CultureInfo culture = null)
    {
      var comp = StringComparer.Create(culture ?? CultureInfo.CurrentCulture, caseInsensitive);
      return new CollectionOfStrings(this.Distinct(comp));
    }
    public string Longest()
    {
      if (this.IsEmpty) return null;
      return this.Aggregate((longest, val) => (val?.Length ?? 0) > (longest?.Length ?? 0) ? val : longest);
    }
    public string Shortest()
    {
      if (this.IsEmpty) return null;
      return this.Aggregate((shortest, val) => (val?.Length ?? 0) < (shortest?.Length ?? 0) ? val : shortest);
    }
    public int TotalCharacters => this.Sum(x => x?.Length ?? 0);
    private static int NativeNaturalCompare(string left, string right, CultureInfo culture)
    {
      if (left == right) return 0;
      if (left == null) return -1;
      if (right == null) return 1;
      return StringComparer.Create(culture ?? CultureInfo.CurrentCulture, true).Compare(left, right);
    }
  }
}
