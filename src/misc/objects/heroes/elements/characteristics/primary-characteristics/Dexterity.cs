using System;
using System.Collections.Generic;

namespace Common.Base
{
    public class Dexterity : PrimaryCharacteristic
    {
        public static new Collection<Dexterity> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Dexterity>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Dexterity dexterityInstance)
                {
                    filteredList.Add(dexterityInstance);
                }
            });
            return new Collection<Dexterity>(filteredList);
        }

        public Dexterity(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Dexterity", "DEX", "3"))
        {
        }

        public int DexterityRoll()
        {
            return this.CharacteristicRoll();
        }

        public int EffectiveDexterityRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }
    }

    /// <summary>
    /// Special purpose collection wrapper for managing portfolios of Dexterity attributes.
    /// </summary>
    public class DexterityCharacteristics : Collection<Dexterity>
    {
        public DexterityCharacteristics() : base() { }
        public DexterityCharacteristics(IEnumerable<Dexterity> items) : base(items) { }
    }
}
