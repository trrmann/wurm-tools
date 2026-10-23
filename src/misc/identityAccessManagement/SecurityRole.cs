namespace Common.IAM
{
    /// <summary>
    /// Represents a dynamic runtime security role.
    /// </summary>
    public class SecurityRole : IEquatable<SecurityRole>
    {
        public string Name { get; }

        public SecurityRole(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Role name cannot be empty or whitespace.", nameof(name));
            Name = name.Trim();
        }

        public bool Equals(SecurityRole other)
        {
            if (other is null) return false;
            return string.Equals(Name, other.Name, StringComparison.OrdinalIgnoreCase);
        }

        public override bool Equals(object obj) => Equals(obj as SecurityRole);

        public override int GetHashCode() => StringComparer.OrdinalIgnoreCase.GetHashCode(Name);

        public override string ToString() => Name;
    }

}
