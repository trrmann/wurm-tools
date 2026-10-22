using System;
using System.Collections.Generic;

namespace Common.Base
{
    public class Constitution : PrimaryCharacteristic
    {
        public static new Collection<Constitution> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }

            var filteredList = new List<Constitution>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Constitution constitutionInstance)
                {
                    filteredList.Add(constitutionInstance);
                }
            });

            return new Collection<Constitution>(filteredList);
        }

        public Constitution(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Constitution", "CON", "2"))
        {
        }

        public int ConstitutionRoll()
        {
            return this.CharacteristicRoll();
        }

        public int EffectiveConstitutionRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }
    }

    public class ConstitutionCharacteristics : Collection<Constitution>
    {
        public ConstitutionCharacteristics() : base() { }
        public ConstitutionCharacteristics(IEnumerable<Constitution> items) : base(items) { }
    }
}
