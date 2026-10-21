
namespace Common.Base
{
    // Define the distinct name components as subclasses of Name and Names<T>
    public class TitleNames : Names<Base.TitleName> { public TitleNames() : base() { } public TitleNames(object items) : base(items) { } }

    public class FirstNames : Names<Base.FirstName> { public FirstNames() : base() { } public FirstNames(object items) : base(items) { } }

    public class MiddleNames : Names<Base.MiddleName> { public MiddleNames() : base() { } public MiddleNames(object items) : base(items) { } }

    public class PrefixNames : Names<Base.PrefixName> { public PrefixNames() : base() { } public PrefixNames(object items) : base(items) { } }

    public class NameParticles : Names<Base.NameParticle> { public NameParticles() : base() { } public NameParticles(object items) : base(items) { } }

    public class FamilyNames : Names<Base.FamilyName> { public FamilyNames() : base() { } public FamilyNames(object items) : base(items) { } }

    public class PatronymicNames : Names<Base.PatronymicName> { public PatronymicNames() : base() { } public PatronymicNames(object items) : base(items) { } }

    public class MatronymicNames : Names<Base.MatronymicName> { public MatronymicNames() : base() { } public MatronymicNames(object items) : base(items) { } }

    public class SuffixNames : Names<Base.SuffixName> { public SuffixNames() : base() { } public SuffixNames(object items) : base(items) { } }

    public class PreferredNames : Names<Base.PreferredName> { public PreferredNames() : base() { } public PreferredNames(object items) : base(items) { } }

    public class CredentialNames : Names<Base.CredentialName> { public CredentialNames() : base() { } public CredentialNames(object items) : base(items) { } }

    /// <summary>
    /// A collection of PersonName entities extending the underlying numeric/string collection base.
    /// </summary>
    public class PersonNames : Base.Collection<Base.PersonName>
    {
        public PersonNames() : base() { }

        public PersonNames(System.Collections.Generic.IEnumerable<Base.PersonName> items) : base(items) { }
    }
}