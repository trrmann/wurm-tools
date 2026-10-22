using System;
using System.Collections.Generic;

namespace Common.Base
{
    /// <summary>
    /// Represents the physical structural health and mass characteristic of a character.
    /// </summary>
    public class Body : PrimaryCharacteristic
    {
        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Body.
        /// </summary>
        public static new Collection<Body> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Body>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Body bodyInstance)
                {
                    filteredList.Add(bodyInstance);
                }
            });

            return new Collection<Body>(filteredList);
        }

        /// <summary>
        /// Instantiates a Body characteristic and sets the default system cost rate metrics.
        /// </summary>
        public Body(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Body", "BODY", "2"))
        {
        }

        /// <summary>
        /// Computes the success threshold target for base body characteristic validation tests.
        /// </summary>
        public int BodyRoll()
        {
            return this.CharacteristicRoll();
        }

        /// <summary>
        /// Computes the success threshold target for transient status modified body checks.
        /// </summary>
        public int EffectiveBodyRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }
    }

    /// <summary>
    /// Companion collection subclass optimized to manage a portfolio of Body characteristics.
    /// </summary>
    public class BodyCharacteristics : Collection<Body>
    {
        public BodyCharacteristics() : base() { }
        public BodyCharacteristics(IEnumerable<Body> items) : base(items) { }
    }
}