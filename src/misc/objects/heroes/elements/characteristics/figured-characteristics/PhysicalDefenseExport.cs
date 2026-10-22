using System;

namespace Common.Base
{
    /// <summary>
    /// Provides compilation hooks and type metadata anchors that replicate the modular export footprint.
    /// To use these references directly across separate code files, ensure they are placed within the matching namespace
    /// or explicitly mapped with type alias directives at the top of your files:
    /// using PhysicalDefense = Common.Base.PhysicalDefense;
    /// using PhysicalDefenseCharacteristics = Common.Base.PhysicalDefenseCharacteristics;
    /// </summary>
    public static class PhysicalDefenseExport
    {
        public static readonly Type TargetType = typeof(Common.Base.PhysicalDefense);
        public static readonly Type TargetCollectionType = typeof(Common.Base.PhysicalDefenseCharacteristics);
    }
}
