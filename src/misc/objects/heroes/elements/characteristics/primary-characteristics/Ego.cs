using System;
using System.Collections.Generic;

namespace Common.Base
{
    public class Ego : PrimaryCharacteristic
    {
        public static new Collection<Ego> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a CharacterElements object");
            }
            var filteredList = new List<Ego>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Ego egoInstance)
                {
                    filteredList.Add(egoInstance);
                }
            });
            return new Collection<Ego>(filteredList);
        }

        public Ego(IDictionary<string, object> options = null) : base(ConfigureOptions(options, "Ego", "EGO", "2"))
        {
        }

        public int EgoRoll()
        {
            return this.CharacteristicRoll();
        }

        public int EffectiveEgoRoll()
        {
            return this.EffectiveCharacteristicRoll();
        }
    }

    public class EgoCharacteristics : Collection<Ego>
    {
        public EgoCharacteristics() : base() { }
        public EgoCharacteristics(IEnumerable<Ego> items) : base(items) { }
    }
}
