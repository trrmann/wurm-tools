using System;
using System.Collections.Generic;
using System.Linq;

namespace Common.Base
{
    public class Collection<T> : List<T>
    {
        public Collection() : base() { }

        public Collection(IEnumerable<T> items) : base()
        {
            if (items != null)
            {
                this.AddRange(items);
            }
        }

        public static Collection<T> Of(params T[] items)
        {
            return new Collection<T>(items);
        }

        public static int CompareValues(object left, object right)
        {
            if (ReferenceEquals(left, right)) return 0;
            if (left == null) return -1;
            if (right == null) return 1;

            if (left is DateTime leftDate && right is DateTime rightDate)
            {
                return leftDate.CompareTo(rightDate);
            }
            if (left is string leftStr && right is string rightStr)
            {
                return string.Compare(leftStr, rightStr, StringComparison.CurrentCulture);
            }
            if (left is IComparable comp)
            {
                return comp.CompareTo(right);
            }
            throw new ArgumentException("Values are not comparable");
        }

        public int Size => this.Count;

        public bool IsEmpty => this.Count == 0;

        public T First => this.Count > 0 ? this[0] : throw new InvalidOperationException("Sequence contains no elements");

        public T Last => this.Count > 0 ? this[this.Count - 1] : throw new InvalidOperationException("Sequence contains no elements");

        public virtual Collection<T> Create(IEnumerable<T> items)
        {
            return new Collection<T>(items);
        }

        public Collection<U> Map<U>(Func<T, int, Collection<T>, U> mapper)
        {
            var mapped = new List<U>();
            this.ForEach((item, index, coll) => mapped.Add(mapper(item, index, coll)));
            return new Collection<U>(mapped);
        }

        public Collection<T> Filter(Func<T, int, Collection<T>, bool> predicate)
        {
            var filtered = new List<T>();
            this.ForEach((item, index, coll) =>
            {
                if (predicate(item, index, coll)) filtered.Add(item);
            });
            return this.Create(filtered);
        }

        public Collection<T> Where(Func<T, int, Collection<T>, bool> predicate)
        {
            return this.Filter(predicate);
        }

        public void ForEach(Action<T, int, Collection<T>> action)
        {
            for (int i = 0; i < this.Count; i++)
            {
                action(this[i], i, this);
            }
        }

        public Collection<T> SortBy<TKey>(Func<T, TKey> selector, Comparison<TKey> comparator = null)
        {
            if (selector == null) throw new ArgumentNullException(nameof(selector));

            Comparison<TKey> compare = comparator ?? ((left, right) => CompareValues(left, right));

            this.Sort((left, right) => compare(selector(left), selector(right)));
            return this;
        }

        public Dictionary<TKey, Collection<T>> GroupBy<TKey>(Func<T, int, Collection<T>, TKey> selector)
        {
            if (selector == null) throw new ArgumentNullException(nameof(selector));
            var groups = new Dictionary<TKey, Collection<T>>();
            this.ForEach((item, index, coll) =>
            {
                TKey key = selector(item, index, coll);
                if (!groups.ContainsKey(key)) groups[key] = this.Create(new List<T>());
                groups[key].Add(item);
            });
            return groups;
        }

        public Tuple<Collection<T>, Collection<T>> Partition(Func<T, int, Collection<T>, bool> predicate)
        {
            if (predicate == null) throw new ArgumentNullException(nameof(predicate));
            var matching = new List<T>();
            var remaining = new List<T>();
            this.ForEach((item, index, coll) =>
            {
                if (predicate(item, index, coll)) matching.Add(item);
                else remaining.Add(item);
            });
            return Tuple.Create(this.Create(matching), this.Create(remaining));
        }

        public T FindById<TId>(TId id, Func<T, TId> idSelector)
        {
            return this.Find(item => EqualityComparer<TId>.Default.Equals(idSelector(item), id));
        }

        public bool RemoveById<TId>(TId id, Func<T, TId> idSelector)
        {
            int index = this.FindIndex(item => EqualityComparer<TId>.Default.Equals(idSelector(item), id));
            if (index < 0) return false;
            this.RemoveAt(index);
            return true;
        }

        public Collection<T> Add(params T[] items)
        {
            this.AddRange(items);
            return this;
        }

        public new Collection<T> AddRange(IEnumerable<T> items)
        {
            if (items == null) throw new ArgumentNullException(nameof(items));
            var source = ReferenceEquals(items, this) ? this.ToArray() : items;
            base.AddRange(source);
            return this;
        }

        public Collection<T> Insert(int index, params T[] items)
        {
            int position = index < 0 ? Math.Max(this.Count + index, 0) : Math.Min(index, this.Count);
            base.InsertRange(position, items);
            return this;
        }

        public new bool Remove(T item)
        {
            int index = this.FindIndex(candidate => EqualityComparer<T>.Default.Equals(candidate, item));
            if (index < 0) return false;
            base.RemoveAt(index);
            return true;
        }

        public new T RemoveAt(int index)
        {
            int position = index < 0 ? this.Count + index : index;
            if (position < 0 || position >= this.Count) throw new ArgumentOutOfRangeException(nameof(index));
            T item = this[position];
            base.RemoveAt(position);
            return item;
        }

        public Collection<T> RemoveWhere(Func<T, int, Collection<T>, bool> predicate)
        {
            if (predicate == null) throw new ArgumentNullException(nameof(predicate));
            var original = this.ToArray();
            var kept = new List<T>();
            var removed = new List<T>();

            for (int i = 0; i < original.Length; i++)
            {
                if (predicate(original[i], i, this)) removed.Add(original[i]);
                else kept.Add(original[i]);
            }
            this.Clear();
            this.AddRange(kept);
            return this.Create(removed);
        }

        public new bool Contains(T item)
        {
            return base.Contains(item);
        }

        public int CountWhere(Func<T, int, Collection<T>, bool> predicate)
        {
            ArgumentNullException.ThrowIfNull(predicate);
            int total = 0;
            this.ForEach((item, index, coll) =>
            {
                if (predicate(item, index, coll)) total++;
            });
            return total;
        }

        public new Collection<T> Clear()
        {
            base.Clear();
            return this;
        }

        public Collection<T> Clone()
        {
            return this.Create(this);
        }

        public new T[] ToArray()
        {
            return base.ToArray();
        }

        public string ToJSON()
        {
            return System.Text.Json.JsonSerializer.Serialize(this.ToArray());
        }
    }
}