namespace Common.Base
{


    public class ClassificationNames : Names<ClassificationName>
    {
        public ClassificationNames() : base() { }
        public ClassificationNames(object items) : base(items) { }
    }


    public class SpecificationNames : Names<SpecificationName>
    {
        public SpecificationNames() : base() { }
        public SpecificationNames(object items) : base(items) { }
    }


    public class CategorizationNames : Names<CategorizationName>
    {
        public CategorizationNames() : base() { }
        public CategorizationNames(object items) : base(items) { }
    }

    /// <summary>
    /// Shared named entity parent for people, places, events, actions, and objects.
    /// </summary>

    public class ThingNames : Names<ThingName>
    {
        public ThingNames() : base() { }
        public ThingNames(object items) : base(items) { }
    }


    public class EventNames : Names<EventName>
    {
        public EventNames() : base() { }
        public EventNames(object items) : base(items) { }
    }


    public class ActionNames : Names<ActionName>
    {
        public ActionNames() : base() { }
        public ActionNames(object items) : base(items) { }
    }


    public class DescriptionNames : Names<DescriptionName>
    {
        public DescriptionNames() : base() { }
        public DescriptionNames(object items) : base(items) { }
    }
}
