
namespace Common.Base
{
    /// <summary>
    /// A string value with a native-like comparison API.
    /// </summary>
    public class Name : IEquatable<Name>, IEquatable<string>
    {
        private readonly string _value;

        public Name(object value = null)
        {
            value ??= "";
            if (!CollectionOfStrings.IsString(value)) 
                throw new TypeErrorException("Name must be a string");
                
            _value = value.ToString();
        }

        public bool Equals(Name other)
        {
            if (other is null) return false;
            return _value == other._value;
        }

        public bool Equals(string other)
        {
            if (other is null) return false;
            return _value == other;
        }

        public override bool Equals(object obj)
        {
            if (obj is Name otherName) return Equals(otherName);
            if (obj is string otherStr) return Equals(otherStr);
            return false;
        }

        public override int GetHashCode()
        {
            return _value?.GetHashCode() ?? 0;
        }

        public override string ToString()
        {
            return _value;
        }

        public static implicit operator string(Name name) => name?._value;
    }

}
