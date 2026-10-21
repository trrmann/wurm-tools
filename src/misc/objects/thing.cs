namespace Common.Base
{

    public class ClassificationName : Name
    {
        public ClassificationName(object val = null) : base(val) { }
    }


    public class SpecificationName : Name
    {
        public SpecificationName(object val = null) : base(val) { }
    }


    public class CategorizationName : Name
    {
        public CategorizationName(object val = null) : base(val) { }
    }


    /// <summary>
    /// Shared named entity parent for people, places, events, actions, and objects.
    /// </summary>
    public class ThingName : Name
    {
        public ClassificationNames ClassificationNames { get; set; }
        public SpecificationNames SpecificationNames { get; set; }
        public CategorizationNames CategorizationNames { get; set; }

        public ThingName(object value = null, object metadata = null) : base(GetLabel(value, metadata))
        {
            var options = GetOptions(value, metadata);

            object cName = options.ContainsKey("classificationName") ? options["classificationName"] : (options.ContainsKey("classification") ? options["classification"] : null);
            object cNames = options.ContainsKey("classificationNames") ? options["classificationNames"] : (options.ContainsKey("classifications") ? options["classifications"] : null);

            object sName = options.ContainsKey("specificationName") ? options["specificationName"] : (options.ContainsKey("specification") ? options["specification"] : null);
            object sNames = options.ContainsKey("specificationNames") ? options["specificationNames"] : (options.ContainsKey("specifications") ? options["specifications"] : null);

            object catName = options.ContainsKey("categorizationName") ? options["categorizationName"] : (options.ContainsKey("categorization") ? options["categorization"] : null);
            object catNames = options.ContainsKey("categorizationNames") ? options["categorizationNames"] : (options.ContainsKey("categorizations") ? options["categorizations"] : null);

            this.ClassificationNames = new ClassificationNames(Classifiers.NormalizeValues(cName, cNames));
            this.SpecificationNames = new SpecificationNames(Classifiers.NormalizeValues(sName, sNames));
            this.CategorizationNames = new CategorizationNames(Classifiers.NormalizeValues(catName, catNames));
        }

        private static object GetLabel(object value, object metadata)
        {
            if (value != null && !CollectionOfStrings.IsString(value) && value is Dictionary<string, object> dict)
            {
                if (dict.ContainsKey("name")) return dict["name"];
                if (dict.ContainsKey("label")) return dict["label"];
                return "";
            }
            return value ?? "";
        }

        private static Dictionary<string, object> GetOptions(object value, object metadata)
        {
            if (value != null && !CollectionOfStrings.IsString(value) && value is Dictionary<string, object> dict)
            {
                return dict;
            }
            return metadata as Dictionary<string, object> ?? new Dictionary<string, object>();
        }

        public ClassificationNames Classifications
        {
            get => this.ClassificationNames;
            set => this.ClassificationNames = new ClassificationNames(value);
        }

        public SpecificationNames Specifications
        {
            get => this.SpecificationNames;
            set => this.SpecificationNames = new SpecificationNames(value);
        }

        public CategorizationNames Categorizations
        {
            get => this.CategorizationNames;
            set => this.CategorizationNames = new CategorizationNames(value);
        }
    }

    public class EventName : ThingName
    {
        public EventName(object value = null, object metadata = null) : base(value, metadata) { }
    }


    public class ActionName : ThingName
    {
        public ActionName(object value = null, object metadata = null) : base(value, metadata) { }
    }


    public class DescriptionName : ThingName
    {
        public DescriptionName(object value = null, object metadata = null) : base(value, metadata) { }
    }

}
