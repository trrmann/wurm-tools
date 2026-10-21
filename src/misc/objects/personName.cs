using System.Collections;

namespace Common.Base
{
    // Define the distinct name components as subclasses of Name and Names<T>
    public class TitleName : Name { public TitleName(object val = null) : base(val) { } }

    public class FirstName : Name { public FirstName(object val = null) : base(val) { } }

    public class MiddleName : Name { public MiddleName(object val = null) : base(val) { } }

    public class PrefixName : Name { public PrefixName(object val = null) : base(val) { } }

    public class NameParticle : Name { public NameParticle(object val = null) : base(val) { } }

    public class FamilyName : Name { public FamilyName(object val = null) : base(val) { } }

    public class PatronymicName : Name { public PatronymicName(object val = null) : base(val) { } }

    public class MatronymicName : Name { public MatronymicName(object val = null) : base(val) { } }

    public class SuffixName : Name { public SuffixName(object val = null) : base(val) { } }

    public class PreferredName : Name { public PreferredName(object val = null) : base(val) { } }

    public class CredentialName : Name { public CredentialName(object val = null) : base(val) { } }


    public class PersonName : ThingName
    {
        private string _unstructuredName;
        private CultureMetadata _culture;

        public TitleNames Titles { get; set; }
        public PrefixNames Prefixes { get; set; }
        public FirstNames FirstNames { get; set; }
        public MiddleNames MiddleNames { get; set; }
        public PatronymicNames PatronymicNames { get; set; }
        public MatronymicNames MatronymicNames { get; set; }
        public NameParticles NameParticles { get; set; }
        public FamilyNames FamilyNames { get; set; }
        public SuffixNames SuffixNames { get; set; }
        public PreferredNames PreferredNames { get; set; }
        public CredentialNames CredentialNames { get; set; }

        private static List<object> ValuesFrom(object single, object multiple)
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

        private static string JoinNameParts(params CollectionOfStrings[] collections)
        {
            return string.Join(" ", collections
                .Where(c => c != null)
                .SelectMany(c => c.Select(x => x?.ToString()))
                .Where(s => !string.IsNullOrEmpty(s)));
        }

        private static CultureMetadata NormalizeCulture(object culture)
        {
            if (culture == null) return null;
            if (culture is string cultureStr)
            {
                string language = cultureStr.Split('-', '_')[0].ToLower();
                bool familyFirst = new[] { "hu", "ja", "ko", "vi", "zh" }.Contains(language);
                return new CultureMetadata
                {
                    Code = cultureStr,
                    Locale = cultureStr,
                    NameOrder = familyFirst ? "family-first" : "given-first"
                };
            }
            if (culture is CultureMetadata metadata)
            {
                string code = metadata.Code ?? metadata.Locale;
                string language = !string.IsNullOrEmpty(code) ? code.Split('-', '_')[0].ToLower() : "";
                bool familyFirst = new[] { "hu", "ja", "ko", "vi", "zh" }.Contains(language);
                metadata.Code = code;
                metadata.Locale = metadata.Locale ?? code;
                metadata.NameOrder = metadata.NameOrder ?? (familyFirst ? "family-first" : "given-first");

                if (!(metadata.NameOrder is string) && !(metadata.NameOrder is List<string>) && !(metadata.NameOrder is string[]))
                {
                    throw new TypeErrorException("Culture nameOrder must be a string or an array of component names");
                }
                return metadata;
            }
            throw new TypeErrorException("Culture metadata must be a culture code or an object");
        }

        public PersonName(object value = null) : base()
        {
            value ??= new Dictionary<string, object>();
            bool isUnstructured = CollectionOfStrings.IsString(value);

            Dictionary<string, object> options = isUnstructured
                ? new Dictionary<string, object>()
                : (value as Dictionary<string, object> ?? new Dictionary<string, object>());

            Dictionary<string, object> components = isUnstructured ? null : CreateComponents(options);
            object cultureObj = options.ContainsKey("culture") ? options["culture"] : null;
            CultureMetadata culture = isUnstructured ? null : NormalizeCulture(cultureObj);

            this.NameValue = isUnstructured ? value.ToString() : Compose(components, culture);
            this._unstructuredName = isUnstructured ? value.ToString() : null;
            this.Culture = culture;

            if (components != null)
            {
                this.Titles = components["titles"] as TitleNames;
                this.Prefixes = components["prefixes"] as PrefixNames;
                this.FirstNames = components["firstNames"] as FirstNames;
                this.MiddleNames = components["middleNames"] as MiddleNames;
                this.PatronymicNames = components["patronymicNames"] as PatronymicNames;
                this.MatronymicNames = components["matronymicNames"] as MatronymicNames;
                this.NameParticles = components["nameParticles"] as NameParticles;
                this.FamilyNames = components["familyNames"] as FamilyNames;
                this.SuffixNames = components["suffixNames"] as SuffixNames;
                this.PreferredNames = components["preferredNames"] as PreferredNames;
                this.CredentialNames = components["credentialNames"] as CredentialNames;
            }
        }

        public static Dictionary<string, object> CreateComponents(Dictionary<string, object> options)
        {
            options ??= new Dictionary<string, object>();

            Func<string[], object> getAltKey = (keys) =>
            {
                foreach (var k in keys) if (options.ContainsKey(k)) return options[k];
                return null;
            };

            object familyName = getAltKey(new[] { "familyName", "lastName", "surname", "sirName" });
            object familyNames = getAltKey(new[] { "familyNames", "lastNames", "surnameNames", "sirNames" });
            object givenName = getAltKey(new[] { "firstName", "givenName" });
            object givenNames = getAltKey(new[] { "firstNames", "givenNames" });
            object patronymicName = getAltKey(new[] { "patronymicName", "paternalName" });
            object patronymicNames = getAltKey(new[] { "patronymicNames", "paternalNames" });
            object matronymicName = getAltKey(new[] { "matronymicName", "maternalName" });
            object matronymicNames = getAltKey(new[] { "matronymicNames", "maternalNames" });

            return new Dictionary<string, object>
            {
                { "titles", new TitleNames(ValuesFrom(options.ContainsKey("title") ? options["title"] : null, options.ContainsKey("titles") ? options["titles"] : null)) },
                { "prefixes", new PrefixNames(ValuesFrom(options.ContainsKey("prefix") ? options["prefix"] : null, options.ContainsKey("prefixes") ? options["prefixes"] : null)) },
{ "firstNames", new FirstNames(ValuesFrom(givenName, givenNames)) },
{ "middleNames", new MiddleNames(ValuesFrom(options.ContainsKey("middleName") ? options["middleName"] : null, options.ContainsKey("middleNames") ? options["middleNames"] : null)) },
{ "patronymicNames", new PatronymicNames(ValuesFrom(patronymicName, patronymicNames)) },
{ "matronymicNames", new MatronymicNames(ValuesFrom(matronymicName, matronymicNames)) },
{ "nameParticles", new NameParticles(ValuesFrom(options.ContainsKey("nameParticle") ? options["nameParticle"] : null, options.ContainsKey("nameParticles") ? options["nameParticles"] : null)) },
{ "familyNames", new FamilyNames(ValuesFrom(familyName, familyNames)) },
{ "suffixNames", new SuffixNames(ValuesFrom(options.ContainsKey("suffixName") ? options["suffixName"] : null, options.ContainsKey("suffixNames") ? options["suffixNames"] : null)) },
{ "preferredNames", new PreferredNames(ValuesFrom(options.ContainsKey("preferredName") ? options["preferredName"] : null, options.ContainsKey("preferredNames") ? options["preferredNames"] : null)) },
{ "credentialNames", new CredentialNames(ValuesFrom(getAltKey(new[] { "credentialName", "credential" }), getAltKey(new[] { "credentialNames", "credentials" }))) }
};
        }
        public static string Compose(Dictionary<string, object> components, CultureMetadata culture)
        {
            if (components == null) return "";
            if (culture?.FormatName != null) return culture.FormatName(components)?.ToString() ?? "";
            var familyFirstOrder = new List { "prefixes", "titles", "familyNames", "firstNames", "middleNames", "patronymicNames", "matronymicNames", "nameParticles", "suffixNames", "credentialNames" };
            var givenFirstOrder = new List { "prefixes", "titles", "firstNames", "middleNames", "patronymicNames", "matronymicNames", "nameParticles", "familyNames", "suffixNames", "credentialNames" };
            IEnumerable order = givenFirstOrder;
            if (culture?.NameOrder is IEnumerable customOrder) order = customOrder;
            else if (culture?.NameOrder is string[] customArr) order = customArr;
            else if (culture?.NameOrder?.ToString() == "family-first") order = familyFirstOrder;
            var parts = new List();
            foreach (var component in order)
            {
                if (!components.ContainsKey(component) || components[component] == null) continue;
                var val = components[component];
                if (CollectionOfStrings.IsString(val))
                {
                    parts.Add(val.ToString());
                }
                else if (val is IEnumerable enumerable)
                {
                    foreach (var item in enumerable) if (item != null) parts.Add(item.ToString());
                }
                else
                {
                    parts.Add(val.ToString());
                }
            }
            return string.Join(culture?.Separator ?? " ", parts.Where(s => !string.IsNullOrEmpty(s)));
        }
        public string FullName
        {
            get
            {
                var dict = new Dictionary<string, object>
{
{ "titles", Titles }, { "prefixes", Prefixes }, { "firstNames", FirstNames },
{ "middleNames", MiddleNames }, { "patronymicNames", PatronymicNames }, { "matronymicNames", MatronymicNames },
{ "nameParticles", NameParticles }, { "familyNames", FamilyNames }, { "suffixNames", SuffixNames },
{ "preferredNames", PreferredNames }, { "credentialNames", CredentialNames }
};
                string composed = Compose(dict, this.Culture);
                return !string.IsNullOrEmpty(composed) ? composed : (_unstructuredName ?? "");
            }
        }
        public CultureMetadata Culture
        {
            get => _culture;
            set => _culture = NormalizeCulture(value);
        }
        public string Locale => Culture?.Locale;
        public bool IsValid => Validate().Valid;
        public ValidationResult Validate()
        {
            var errors = new List();
            var culture = this.Culture;
            if (culture == null) return new ValidationResult { Valid = true, Errors = errors };
            var dict = new Dictionary<string, object>
{
{ "titles", Titles }, { "prefixes", Prefixes }, { "firstNames", FirstNames },
{ "middleNames", MiddleNames }, { "patronymicNames", PatronymicNames }, { "matronymicNames", MatronymicNames },
{ "nameParticles", NameParticles }, { "familyNames", FamilyNames }, { "suffixNames", SuffixNames },
{ "preferredNames", PreferredNames }, { "credentialNames", CredentialNames }
};
            foreach (var component in culture.RequiredComponents ?? new List())
            {
                if (!dict.ContainsKey(component) || dict[component] == null || (dict[component] is ICollection coll && coll.Count == 0))
                {
                    errors.Add($"Missing required component: {component}");
                }
            }
            return new ValidationResult { Valid = errors.Count == 0, Errors = errors };
        }
    }
}