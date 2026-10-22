namespace Heros.Base
{
    /// <summary>
    /// Represents a primary character statistic, introducing dynamic status adjustments 
    /// and rule-based rolling thresholds on top of base CharacterElement calculations.
    /// </summary>
    public class Characteristic : CharacterElement
    {
        // Encapsulated backing field mirroring the private #adjustment field in JS
        private int _adjustment = 0;

        /// <summary>
        /// Filters an inventory of game traits to isolate elements derived from Characteristic.
        /// </summary>
        public static Collection<Characteristic> Filter(CharacterElements characterElements)
        {
            if (characterElements == null)
            {
                throw new TypeErrorException("Filter expects a valid CharacterElements object");
            }

            var filteredList = new List<Characteristic>();
            characterElements.ForEach((element, index, collection) =>
            {
                if (element is Characteristic characteristicInstance)
                {
                    filteredList.Add(characteristicInstance);
                }
            });

            return new Collection<Characteristic>(filteredList);
        }

        /// <summary>
        /// Instantiates a Characteristic and forwards option arguments to the base CharacterElement calculation pipeline.
        /// </summary>
        public Characteristic(IDictionary<string, object> options = null) : base(options)
        {
            // The backing adjustment value defaults to 0 as declared in the JS blueprint
            this._adjustment = 0;
        }

        /// <summary>
        /// Gets the final calculated performance value, combining the base value with transient status adjustments.
        /// </summary>
        public double Effective
        {
            get => this.ToNumber() + this._adjustment;
        }

        /// <summary>
        /// Gets or sets the temporary modification value assigned to this statistic.
        /// </summary>
        public int Adjustment
        {
            get => this._adjustment;
            set => this._adjustment = value;
        }

        /// <summary>
        /// Gets the target value needed to succeed a characteristic check roll based on standard system rules.
        /// Formula: 9 + round(Value / 5)
        /// </summary>
        public int RollTarget
        {
            get => CalculateRollTarget(this.Value());
        }

        public int EffectiveRollTarget => CalculateRollTarget(this.Effective);

        private static int CalculateRollTarget(double value) =>
            9 + checked((int)Math.Round(value / 5.0, MidpointRounding.AwayFromZero));

        /// <summary>
        /// Incrementally increases the active modifier value.
        /// </summary>
        public void Add(int value)
        {
            this._adjustment += value;
        }

        /// <summary>
        /// Incrementally reduces the active modifier value.
        /// </summary>
        public void Subtract(int value)
        {
            this._adjustment -= value;
        }

        /// <summary>
        /// Evaluates a 3d6 dice total against this characteristic's target roll to check for a success or failure outcome.
        /// </summary>
        public CharacteristicRollResult CheckRoll(int diceTotal)
        {
            return CheckRollAgainstTarget(diceTotal, this.EffectiveRollTarget);
        }

        protected static CharacteristicRollResult CheckRollAgainstTarget(int diceTotal, int target)
        {
            if (diceTotal < 3 || diceTotal > 18)
            {
                throw new ArgumentOutOfRangeException(nameof(diceTotal), "Standard checks are rolled using exactly 3d6 (range 3-18).");
            }

            // Standard critical bounds rules: 3 is always a critical success, 18 is always a critical failure
            if (diceTotal == 3) return CharacteristicRollResult.CriticalSuccess;
            if (diceTotal == 18) return CharacteristicRollResult.CriticalFailure;

            bool isSuccess = diceTotal <= target;
            return isSuccess ? CharacteristicRollResult.Success : CharacteristicRollResult.Failure;
        }
    }
}
