using System.Numerics;
using System.Text.RegularExpressions;

namespace Common.Base
{
    /// <summary>
    /// An immutable, reduced rational number with mixed-number parsing and display.
    /// </summary>
    public class MixedNumber : IComparable, IEquatable<MixedNumber>
    {
        private BigInteger _numerator = 0;
        private BigInteger _denominator = 1;

        public static BigInteger ToInteger(object value, string label)
        {
            if (value is BigInteger bi) return bi;
            if (value is int i) return new BigInteger(i);
            if (value is long l) return new BigInteger(l);
            if (value is short s) return new BigInteger(s);
            throw new TypeErrorException($"{label} must be a safe integer or BigInt");
        }

        public static BigInteger Absolute(BigInteger value)
        {
            return value < 0 ? -value : value;
        }

        public static BigInteger GreatestCommonDivisor(BigInteger left, BigInteger right)
        {
            BigInteger a = Absolute(left);
            BigInteger b = Absolute(right);
            while (b != 0)
            {
                BigInteger temp = b;
                b = a % b;
                a = temp;
            }
            return a == 0 ? 1 : a;
        }

        public static Tuple<BigInteger, BigInteger> DecimalParts(string value)
        {
            var match = Regex.Match(value, @"^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$", RegexOptions.IgnoreCase);
            if (!match.Success) throw new TypeErrorException($"Invalid mixed number: {value}");

            string fraction = match.Groups[3].Success ? match.Groups[3].Value : (match.Groups[4].Success ? match.Groups[4].Value : "");
            int exponent = match.Groups[5].Success ? int.Parse(match.Groups[5].Value) : 0;
            if (Math.Abs(exponent) > 10000)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "Decimal exponent is out of range");
            }

            string wholePart = match.Groups[2].Success ? match.Groups[2].Value : "0";
            string digits = $"{wholePart}{fraction}";
            BigInteger numerator = BigInteger.Parse(string.IsNullOrEmpty(digits) ? "0" : digits);
            if (match.Groups[1].Value == "-") numerator = -numerator;

            int scale = fraction.Length - exponent;
            if (scale < 0) return Tuple.Create(numerator * BigInteger.Pow(10, -scale), (BigInteger)1);
            return Tuple.Create(numerator, BigInteger.Pow(10, scale));
        }

        public MixedNumber(object whole = null, object numerator = null, object denominator = null)
        {
            whole ??= 0;
            numerator ??= 0;
            denominator ??= 1;

            BigInteger valueNumerator;
            BigInteger valueDenominator;

            if (numerator.Equals(0) && denominator.Equals(1) &&
                (whole is string || (whole is double d && d % 1 != 0) || (whole is float f && f % 1 != 0)))
            {
                var parsed = Parse(whole.ToString());
                valueNumerator = parsed._numerator;
                valueDenominator = parsed._denominator;
            }
            else
            {
                BigInteger wholeValue = ToInteger(whole, "Whole part");
                BigInteger numeratorValue = ToInteger(numerator, "Numerator");
                BigInteger denominatorValue = ToInteger(denominator, "Denominator");

                if (denominatorValue == 0) throw new ArgumentOutOfRangeException(nameof(denominator), "Denominator cannot be zero");
                if (denominatorValue < 0) throw new ArgumentOutOfRangeException(nameof(denominator), "Denominator must be positive");

                BigInteger sign = wholeValue < 0 ? -1 : (wholeValue > 0 ? 1 : 0);
                valueNumerator = sign == 0
                    ? numeratorValue
                    : sign * (Absolute(wholeValue) * denominatorValue + Absolute(numeratorValue));
                valueDenominator = denominatorValue;
            }

            _numerator = valueNumerator;
            _denominator = valueDenominator;
            Reduce();
        }

        public static MixedNumber From(object value)
        {
            if (value is MixedNumber mn) return mn;
            if (value is string s) return Parse(s);
            if (value is BigInteger bi) return FromImproper(bi, 1);
            if (value is int || value is long || value is short) return FromImproper(ToInteger(value, "Value"), 1);
            if (value is double d && !double.IsInfinity(d) && !double.IsNaN(d)) return Parse(d.ToString("G17"));
            if (value is float f && !float.IsInfinity(f) && !float.IsNaN(f)) return Parse(f.ToString("G9"));

            throw new TypeErrorException("Value must be a MixedNumber, finite number, BigInt, or string");
        }

        protected void SetValue(MixedNumber value)
        {
            ArgumentNullException.ThrowIfNull(value);
            _numerator = value._numerator;
            _denominator = value._denominator;
        }

        public static MixedNumber FromImproper(object numerator, object denominator = null)
        {
            denominator ??= 1;
            BigInteger top = ToInteger(numerator, "Numerator");
            BigInteger bottom = ToInteger(denominator, "Denominator");
            if (bottom == 0) throw new ArgumentOutOfRangeException(nameof(denominator), "Denominator cannot be zero");
            BigInteger sign = bottom < 0 ? -1 : 1;
            return new MixedNumber(0, sign * top, Absolute(bottom));
        }

        public static MixedNumber Parse(string input)
        {
            string value = input.Trim();
            var mixedMatch = Regex.Match(value, @"^([+-]?\d+)\s+(\d+)\s*/\s*(\d+)$");
            if (mixedMatch.Success)
            {
                BigInteger whole = BigInteger.Parse(mixedMatch.Groups[1].Value);
                BigInteger fractionSign = (whole == 0 && mixedMatch.Groups[1].Value.StartsWith("-")) ? -1 : 1;
                return new MixedNumber(whole, fractionSign * BigInteger.Parse(mixedMatch.Groups[2].Value), BigInteger.Parse(mixedMatch.Groups[3].Value));
            }

            var fractionMatch = Regex.Match(value, @"^([+-]?\d+)\s*/\s*(\d+)$");
            if (fractionMatch.Success)
            {
                return FromImproper(BigInteger.Parse(fractionMatch.Groups[1].Value), BigInteger.Parse(fractionMatch.Groups[2].Value));
            }

            var parts = DecimalParts(value);
            return FromImproper(parts.Item1, parts.Item2);
        }

        public BigInteger WholeBigInt => _numerator / _denominator;

        public BigInteger NumeratorBigInt
        {
            get
            {
                BigInteger remainder = Absolute(_numerator) % _denominator;
                return (WholeBigInt == 0 && _numerator < 0) ? -remainder : remainder;
            }
        }

        public BigInteger DenominatorBigInt => _denominator;

        public double Whole => (double)WholeBigInt;

        public double Numerator => (double)NumeratorBigInt;

        public double Denominator => (double)_denominator;

        public int Sign => _numerator < 0 ? -1 : (_numerator > 0 ? 1 : 0);

        public bool IsInteger => _numerator % _denominator == 0;

        public MixedNumber Add(object value)
        {
            MixedNumber other = From(value);
            return FromImproper(
                _numerator * other._denominator + other._numerator * _denominator,
                _denominator * other._denominator
            );
        }

        public MixedNumber Subtract(object value)
        {
            MixedNumber other = From(value);
            return FromImproper(
                _numerator * other._denominator - other._numerator * _denominator,
                _denominator * other._denominator
            );
        }

        public MixedNumber Multiply(object value)
        {
            MixedNumber other = From(value);
            return FromImproper(
                _numerator * other._numerator,
                _denominator * other._denominator
            );
        }

        public MixedNumber Divide(object value)
        {
            MixedNumber other = From(value);
            if (other._numerator == 0) throw new ArgumentOutOfRangeException(nameof(value), "Cannot divide by zero");
            return FromImproper(
                _numerator * other._denominator,
                _denominator * other._numerator
            );
        }

        public MixedNumber Negate()
        {
            return FromImproper(-_numerator, _denominator);
        }

        public MixedNumber Abs()
        {
            return FromImproper(Absolute(_numerator), _denominator);
        }

        public int Compare(object value)
        {
            MixedNumber other = From(value);
            BigInteger difference = _numerator * other._denominator - other._numerator * _denominator;
            return difference < 0 ? -1 : (difference > 0 ? 1 : 0);
        }

        public int CompareTo(object obj)
        {
            return Compare(obj);
        }

        public bool Equals(MixedNumber other)
        {
            if (other == null) return false;
            return Compare(other) == 0;
        }

        public override bool Equals(object obj)
        {
            if (obj == null) return false;
            try { return Compare(obj) == 0; } catch { return false; }
        }

        public override int GetHashCode()
        {
            return Tuple.Create(_numerator, _denominator).GetHashCode();
        }

        public double ToNumber()
        {
            return (double)_numerator / (double)_denominator;
        }

        public string ToImproperString()
        {
            return $"{_numerator}/{_denominator}";
        }

        public override string ToString()
        {
            string sign = _numerator < 0 ? "-" : "";
            BigInteger absoluteNumerator = Absolute(_numerator);
            BigInteger whole = absoluteNumerator / _denominator;
            BigInteger remainder = absoluteNumerator % _denominator;

            if (remainder == 0) return $"{sign}{whole}";
            if (whole == 0) return $"{sign}{remainder}/{_denominator}";
            return $"{sign}{whole} {remainder}/{_denominator}";
        }
        public string ToJSON()
        {
            return ToString();
        }
        private void Reduce()
        {
            BigInteger divisor = GreatestCommonDivisor(_numerator, _denominator);
            _numerator /= divisor;
            _denominator /= divisor;
        }
    }

}