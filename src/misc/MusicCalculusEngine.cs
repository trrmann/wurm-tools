// Single Consolidated File: MusicCalculusEngine.cs
using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace MusicCalculusEngine
{
    // ==========================================
    // 1. SCALE CONFIGURATION PRESETS
    // ==========================================
    public static class ScalePreset
    {
        public static readonly int[] DiatonicMajor = { 0, 2, 4, 5, 7, 9, 11 };
        public static readonly int[] NaturalMinor = { 0, 2, 3, 5, 7, 8, 10 };
        public static readonly int[] HarmonicMinor = { 0, 2, 3, 5, 7, 8, 11 };
        public static readonly int[] MelodicMinor = { 0, 2, 3, 5, 7, 9, 11 };
        public static readonly int[] PentatonicMajor = { 0, 2, 4, 7, 9 };
        public static readonly int[] PentatonicMinor = { 0, 3, 5, 7, 10 };
        
        // Modes
        public static readonly int[] Dorian = { 0, 2, 3, 5, 7, 9, 10 };
        public static readonly int[] Phrygian = { 0, 1, 3, 5, 7, 8, 10 };
        public static readonly int[] Lydian = { 0, 2, 4, 6, 7, 9, 11 };
        public static readonly int[] Mixolydian = { 0, 2, 4, 5, 7, 9, 10 };
        public static readonly int[] Locrian = { 0, 1, 3, 5, 6, 8, 10 };
    }

    // ==========================================
    // 2. BIDIRECTIONAL CALCULUS CORE ENGINE
    // ==========================================
    public class DynamicKeyFrequencyEngine
    {
        private readonly int[] _intervals;
        private readonly int _scaleSize;
        private readonly int _rootOffset; 
        private const double F0 = 261.6255653005986; // Middle C (Hz)

        public DynamicKeyFrequencyEngine(int[] intervals, int rootOffset = 0)
        {
            if (intervals == null || intervals.Length == 0)
                throw new ArgumentException("Interval array cannot be null or empty.");
            
            _intervals = (int[])intervals.Clone();
            _scaleSize = _intervals.Length;
            _rootOffset = rootOffset;
        }

        /// <summary>
        /// Forward Integration: Continuous Key Ordinal -> Physical Frequency (Hz)
        /// Handles fractional half-point sharps safely.
        /// </summary>
        public double KeyOrdinalToFrequency(double k)
        {
            double floorK = Math.Floor(k);
            double fraction = k - floorK;

            int octave = (int)Math.Floor(floorK / _scaleSize);
            
            int noteIndex = (int)(floorK % _scaleSize);
            if (noteIndex < 0) noteIndex += _scaleSize;

            int nextIndex = (noteIndex + 1) % _scaleSize;
            
            int currentStep = _intervals[noteIndex];
            int nextStep = _intervals[nextIndex];
            
            if (nextIndex == 0) nextStep += 12; 

            double chromaticOrdinal = (octave * 12) + currentStep + (fraction * (nextStep - currentStep)) + _rootOffset;
            return F0 * Math.Pow(2.0, chromaticOrdinal / 12.0);
        }

        /// <summary>
        /// Inverse Integration: Physical Frequency -> Continuous Key Ordinal
        /// </summary>
        public double FrequencyToKeyOrdinal(double frequency)
        {
            double chromaticOrdinal = 12.0 * Math.Log(frequency / F0) / Math.Log(2.0) - _rootOffset;
            
            double octave = Math.Floor(chromaticOrdinal / 12.0);
            double chromaticRemainder = chromaticOrdinal - (octave * 12.0);

            if (chromaticRemainder < 0)
            {
                chromaticRemainder += 12.0;
                octave -= 1.0;
            }

            int noteIndex = 0;
            double fraction = 0.0;

            for (int i = 0; i < _scaleSize; i++)
            {
                int currentStep = _intervals[i];
                int nextStep = (i == _scaleSize - 1) ? 12 : _intervals[i + 1];

                if (chromaticRemainder >= currentStep && chromaticRemainder <= nextStep)
                {
                    noteIndex = i;
                    fraction = (chromaticRemainder - currentStep) / (nextStep - currentStep);
                    break;
                }
            }

            return (octave * _scaleSize) + noteIndex + fraction;
        }
    }

    // ==========================================
    // 3. STATISTICAL VALIDATION SUITE (95% CONFIDENCE)
    // ==========================================
    [TestFixture]
    public class DynamicKeyFrequencyEngineTests
    {
        private const double ConfidenceLevel95Z = 1.96;

        [TestCaseSource(nameof(GetScaleTestCases))]
        public void VerifyBidirectionalCalculusIntegration_WithStatisticalProof(int[] intervals, string scaleName)
        {
            var engine = new DynamicKeyFrequencyEngine(intervals, rootOffset: 0);
            
            int totalSamples = 1000;
            int successfulPasses = 0;
            var rand = new Random(42); // Deterministic seed

            for (int i = 0; i < totalSamples; i++)
            {
                // Range containing random continuous fractional values between -3 and +3 octaves
                double originalK = (rand.NextDouble() * 6.0) - 3.0;

                double frequency = engine.KeyOrdinalToFrequency(originalK);
                double reconstructedK = engine.FrequencyToKeyOrdinal(frequency);

                double error = Math.Abs(originalK - reconstructedK);

                if (error < 1e-7)
                {
                    successfulPasses++;
                }
            }

            double sampleProportion = (double)successfulPasses / totalSamples;
            double standardError = Math.Sqrt((sampleProportion * (1 - sampleProportion)) / totalSamples);
            double lowerBound95 = sampleProportion - (ConfidenceLevel95Z * standardError);

            Console.WriteLine($"Scale: {scaleName} | Samples: {totalSamples} | Success Rate: {sampleProportion:P2} | 95% CI Lower Bound: {lowerBound95:P2}");

            Assert.That(lowerBound95, Is.GreaterThanOrEqualTo(0.95), 
                $"Scale '{scaleName}' failed 95% statistical accuracy assertion. Lower Bound: {lowerBound95:P4}");
        }

        private static object[] GetScaleTestCases()
        {
            return new object[]
            {
                new object[] { ScalePreset.DiatonicMajor, "Diatonic Major" },
                new object[] { ScalePreset.NaturalMinor, "Natural Minor" },
                new object[] { ScalePreset.HarmonicMinor, "Harmonic Minor" },
                new object[] { ScalePreset.MelodicMinor, "Melodic Minor" },
                new object[] { ScalePreset.PentatonicMajor, "Pentatonic Major" },
                new object[] { ScalePreset.PentatonicMinor, "Pentatonic Minor" },
                new object[] { ScalePreset.Dorian, "Dorian Mode" },
                new object[] { ScalePreset.Phrygian, "Phrygian Mode" }
            };
        }
    }
}
