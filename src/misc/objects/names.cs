using System.Collections;

namespace Common.Base
{
    /// <summary>
    /// Generic implementation of Names to support variable underlying Name subclasses.
    /// </summary>
    public class Names<T> : Base.CollectionOfStrings where T : Name
    {
        public static Type NameType => typeof(T);

        public static bool IsString(object value)
        {
            if (value is Name nameInstance) return nameInstance is T;
            return CollectionOfStrings.IsString(value);
        }

        public static T ToName(object value)
        {
            if (value is T strictMatch) return strictMatch;
            if (value is Name incompatibleName)
            {
                throw new TypeErrorException($"{NameType.Name} cannot contain {incompatibleName.GetType().Name}");
            }
            return (T)Activator.CreateInstance(NameType, value);
        }

        public Names() : base() { }

        public Names(object items) : base()
        {
            if (items is int capacity && capacity >= 0)
            {
                // To emulate super(items) where items is length
                this.Capacity = capacity;
                return;
            }

            IEnumerable plainValues;
            if (CollectionOfStrings.IsString(items))
            {
                plainValues = new List<object> { items };
            }
            else if (items == null)
            {
                plainValues = new List<object>();
            }
            else if (items is IEnumerable enumerable)
            {
                plainValues = enumerable;
            }
            else
            {
                throw new TypeErrorException($"{this.GetType().Name} requires strings or an iterable of strings");
            }

            foreach (var val in plainValues)
            {
                if (val is Name rawName && !(rawName is T))
                {
                    throw new TypeErrorException($"{this.GetType().Name} cannot contain {rawName.GetType().Name}");
                }
                
                string strVal = val is Name ? rawName.ToString() : val.ToString();
                this.Add(ToName(strVal));
            }
        }

        public int Push(params object[] values)
        {
            foreach (var val in values)
            {
                base.Add(ToName(val));
            }
            return this.Count;
        }

        public int Unshift(params object[] values)
        {
            int index = 0;
            foreach (var val in values)
            {
                base.Insert(index++, ToName(val));
            }
            return this.Count;
        }

        public CollectionOfStrings Splice(int start, int? deleteCount = null, params object[] values)
        {
            int position = start < 0 ? Math.Max(this.Count + start, 0) : Math.Min(start, this.Count);
            int countToRemove = deleteCount ?? (this.Count - position);
            
            var removed = new CollectionOfStrings();
            for (int i = 0; i < countToRemove && position < this.Count; i++)
            {
                removed.Add(this[position]);
                base.RemoveAt(position);
            }

            foreach (var val in values)
            {
                base.Insert(position++, ToName(val));
            }

            return removed;
        }

        public Names<T> Add(params object[] values)
        {
            Push(values);
            return this;
        }

        public Names<T> AddRange(object values)
        {
            if (values == null || !(values is IEnumerable enumerable))
            {
                throw new TypeErrorException("Items must be iterable");
            }
            
            foreach (var item in enumerable)
            {
                this.Add(item);
            }
            return this;
        }

        public Names<T> Insert(int index, params object[] values)
        {
            int position = index < 0 ? Math.Max(this.Count + index, 0) : Math.Min(index, this.Count);
            foreach (var val in values)
            {
                base.Insert(position++, ToName(val));
            }
            return this;
        }

        public Names<T> Fill(object value, int? start = null, int? end = null)
        {
            int beginIdx = start ?? 0;
            int endIdx = end ?? this.Count;
            
            beginIdx = beginIdx < 0 ? Math.Max(this.Count + beginIdx, 0) : Math.Min(beginIdx, this.Count);
            endIdx = endIdx < 0 ? Math.Max(this.Count + endIdx, 0) : Math.Min(endIdx, this.Count);
            
            string stringRepresentation = ToName(value);

            for (int i = beginIdx; i < endIdx; i++)
            {
                this[i] = stringRepresentation;
            }
            return this;
        }
    }

    /// <summary>
    /// Default non-generic collection mapping directly to the standard Name class.
    /// </summary>
    public class Names : Names<Name>
    {
        public Names() : base() { }
        public Names(object items) : base(items) { }
    }
}
