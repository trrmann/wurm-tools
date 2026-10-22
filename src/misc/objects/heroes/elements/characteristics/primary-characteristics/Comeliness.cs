using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the Comeliness characteristic, managing appearance metrics and roll mapping.
    /// </summary>
    public class Comeliness : PrimaryCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Comeliness.
        /// </summary>
        public static new Collection<Comeliness> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Comeliness>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Comeliness comelinessInstance)
                {
                    filteredList.Add(comelinessInstance);
                }
            });

            return new Collection<Comeliness>(filteredList);
        }

        /// <summary>
        /// Instantiates a Comeliness characteristic and sets its baseline values.
        /// </summary>
        public Comeliness(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Comeliness", "COM", "1/2"))
        {
        }

        /// <summary>
        /// Gets the standard base characteristic roll threshold.
        /// </summary>
        public int ComelinessRoll()
        {
            return this.CharacteristicRoll();
        }

        /// <summary>
        /// Gets the active effective characteristic roll threshold.
        /// </summary>
        public int EffectiveComelinessRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }
    }

    /// <summary>
    /// Specialized collection wrapper for managing portfolios of Comeliness attributes.
    /// </summary>
    public class ComelinessCharacteristics : Collection<Comeliness>
    {
        public ComelinessCharacteristics() : base() { }
        public ComelinessCharacteristics(IEnumerable<Comeliness> items) : base(items) { }
    }
}
