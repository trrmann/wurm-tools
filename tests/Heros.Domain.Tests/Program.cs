using Common.Base;
using Heros.Base;

var tests = new (string Name, Action Run)[]
{
    ("Primary defaults and point investments", PrimaryDefaults),
    ("Exact value construction and rounding", ExactValues),
    ("Base and effective characteristic rolls", CharacteristicRolls),
    ("Figured characteristic dependencies", FiguredValues),
    ("Speed initialization and phases", SpeedValues),
    ("Typed filtering preserves instances", Filtering),
    ("Talent construction and validation errors", TalentsAndValidation),
};
int failures = 0;
foreach (var (name, run) in tests)
{
    try
    {
        run();
        Console.WriteLine($"PASS {name}");
    }
    catch (Exception error)
    {
        failures++;
        Console.Error.WriteLine($"FAIL {name}: {error}");
    }
}
Console.WriteLine($"{tests.Length - failures}/{tests.Length} checks passed.");
return failures == 0 ? 0 : 1;

static Dictionary<string, object> Options(params (string Key, object Value)[] values) =>
    values.ToDictionary(pair => pair.Key, pair => pair.Value);

static void Equal<T>(T expected, T actual)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual))
        throw new InvalidOperationException($"Expected {expected}; received {actual}.");
}

static void Throws<T>(Action run) where T : Exception
{
    try { run(); }
    catch (T) { return; }
    throw new InvalidOperationException($"Expected {typeof(T).Name}.");
}

static void PrimaryDefaults()
{
    var cases = new (Type Type, string Name, string ShortName, string Rate)[]
    {
        (typeof(Strength), "Strength", "STR", "1"),
        (typeof(Dexterity), "Dexterity", "DEX", "3"),
        (typeof(Constitution), "Constitution", "CON", "2"),
        (typeof(Body), "Body", "BODY", "2"),
        (typeof(Intelligence), "Intelligence", "INT", "1"),
        (typeof(Ego), "Ego", "EGO", "2"),
        (typeof(Presence), "Presence", "PRE", "1"),
        (typeof(Comeliness), "Comeliness", "COM", "1/2"),
    };
    foreach (var (type, name, shortName, rate) in cases)
    {
        var baseline = (PrimaryCharacteristic)Activator.CreateInstance(type, new object[] { null });
        Equal(10.0, baseline.Value());
        Equal(name, baseline.Name);
        Equal(shortName, baseline.ShortName);
        Equal(rate, baseline.ValueRate.ToString());
        Equal(11, baseline.CharacteristicRoll());
        var input = Options(("Points", 6));
        var invested = (PrimaryCharacteristic)Activator.CreateInstance(type, new object[] { input });
        var exact = MixedNumber.From(10).Add(MixedNumber.From(6).Divide(rate));
        Equal(exact.ToString(), invested.UnroundedValue.ToString());
        Equal("6", invested.Points.ToString());
        Equal(1, input.Count);
        var sold = (PrimaryCharacteristic)Activator.CreateInstance(type, new object[] { Options(("Points", -3)) });
        Equal(MixedNumber.From(10).Add(MixedNumber.From(-3).Divide(rate)).ToString(), sold.UnroundedValue.ToString());
    }
}

static void ExactValues()
{
    foreach (string value in new[] { "1/2", "-1/2", "2 3/4", "-2 3/4", "9007199254740993" })
        Equal(value, new Value(MixedNumber.From(value)).ToString());
    Equal("2 3/4", new Value(2, 3, 4).ToString());
    var valueWithPoints = new HerosValue(Options(("BaseValue", "1/2"), ("Points", 1), ("ValueRate", 2)));
    Equal("1", valueWithPoints.ToString());
    Equal("1/2", valueWithPoints.BaseValue.ToString());
    Equal("1", valueWithPoints.UnroundedValue.ToString());
    var rounding = new (string Mode, string Expected)[]
    {
        ("none", "-3/2"), ("nearest", "-1"), ("down", "-2"),
        ("up", "-1"), ("toward-zero", "-1"),
    };
    foreach (var (mode, expected) in rounding)
    {
        var result = new HerosValue(Options(("BaseValue", "-1 1/2"), ("RoundingMode", mode)));
        Equal(MixedNumber.From(expected).ToString(), result.ToString());
        Equal("-1 1/2", result.UnroundedValue.ToString());
        Equal("-1 1/2", result.BaseValue.ToString());
    }
    Throws<ArgumentOutOfRangeException>(() => new HerosValue(Options(("ValueRate", 0))));
    Throws<ArgumentOutOfRangeException>(() => new HerosValue(Options(("RoundingMode", "invalid"))));
}

static void CharacteristicRolls()
{
    var intelligence = new Intelligence(Options(("Points", 10)));
    Equal(13, intelligence.IntelligenceRoll());
    Equal(CharacteristicRollResult.Success, intelligence.PerceptionRoll(13));
    Equal(CharacteristicRollResult.Failure, intelligence.PerceptionRoll(14));
    intelligence.Adjustment = -10;
    Equal(13, intelligence.PerceptionRollTarget);
    Equal(11, intelligence.EffectivePerceptionRollTarget);
    Equal(CharacteristicRollResult.Success, intelligence.PerceptionRoll(12));
    Equal(CharacteristicRollResult.Failure, intelligence.EffectivePerceptionRoll(12));
    Equal(CharacteristicRollResult.CriticalSuccess, intelligence.CheckRoll(3));
    Equal(CharacteristicRollResult.CriticalFailure, intelligence.CheckRoll(18));
    Throws<ArgumentOutOfRangeException>(() => intelligence.CheckRoll(2));
    Throws<ArgumentOutOfRangeException>(() => intelligence.CheckRoll(19));
    Equal(17, new Strength(Options(("Points", 30))).StrengthRoll());
    Equal(12, new Dexterity(Options(("Points", 9))).DexterityRoll());
    Equal(11, new Body().BodyRoll());
    Equal(11, new Constitution().ConstitutionRoll());
    Equal(11, new Ego().EgoRoll());
    Equal(11, new Presence().PresenceRoll());
    Equal(11, new Comeliness().ComelinessRoll());
    var strength = new Strength();
    strength.Add(5);
    Equal(15.0, strength.EffectiveStrength());
    Equal(12, strength.EffectiveStrengthRoll());
    strength.Subtract(10);
    Equal(10.0, strength.Value());
    Equal(5.0, strength.EffectiveStrength());
    Equal(10, strength.EffectiveStrengthRoll());
    var presence = new Presence { Adjustment = 5 };
    Equal(15.0, presence.EffectivePresence());
    Equal(12, presence.EffectivePresenceRoll());
}

static CharacterElements PrimaryElements() => new(new CharacterElement[]
{
    new Strength(), new Dexterity(), new Constitution(), new Body(), new Ego(), new Intelligence(),
});

static void FiguredValues()
{
    var elements = PrimaryElements();
    var options = Options(("characterElements", elements));
    var cases = new (Func<IDictionary<string, object>, FiguredCharacteristic> Create, double Expected)[]
    {
        (o => new PhysicalDefense(o), 2), (o => new EnergyDefense(o), 2),
        (o => new Recovery(o), 4), (o => new Endurance(o), 20),
        (o => new Stun(o), 20), (o => new OffensiveCombatValue(o), 3),
        (o => new DefensiveCombatValue(o), 3), (o => new EgoCombatValue(o), 3),
        (o => new OffensiveEgoCombatValue(o), 3), (o => new DefensiveEgoCombatValue(o), 3),
    };
    foreach (var (create, expected) in cases)
    {
        Equal(expected, create(options).Value());
        Equal(1, options.Count);
    }
    elements.Add(new PhysicalDefense(options), new EnergyDefense(options));
    Equal(2.0, new Defense(options).Value());
    Equal(5.0, new Defense(Options(("Composition", 5))).Value());
    Throws<InvalidOperationException>(() => new PhysicalDefense());
    Throws<InvalidOperationException>(() => new Speed());
}

static void SpeedValues()
{
    var input = Options(("characterElements", new CharacterElements(new[] { new Dexterity(Options(("Points", 3))) })), ("Points", 8));
    var speed = new Speed(input);
    Equal("2 9/10", speed.UnroundedValue.ToString());
    Equal(2.0, speed.Value());
    Equal("SPD", speed.ShortName);
    Equal("10", speed.ValueRate.ToString());
    Equal("down", speed.RoundingMode);
    Equal(2, input.Count);
    Equal("6,12", string.Join(",", speed.Phases()));
}

static void Filtering()
{
    var strength = new Strength();
    var elements = new CharacterElements(new CharacterElement[] { strength, new Dexterity(), new CombatLuck() });
    Equal(true, ReferenceEquals(strength, Strength.Filter(elements).First));
    Equal(2, PrimaryCharacteristic.Filter(elements).Count);
    Equal(1, Talent.Filter(elements).Count);
    Equal(1, elements.CountWhere((item, _, _) => item is Strength));
    Equal(true, ReferenceEquals(strength, elements.Get("STR").First));
}

static void TalentsAndValidation()
{
    var types = typeof(Talent).Assembly.GetTypes().Where(type => !type.IsAbstract && type.IsSubclassOf(typeof(Talent)));
    foreach (var type in types)
    {
        var talent = (Talent)Activator.CreateInstance(type, new object[] { null });
        Equal(0.0, talent.Value());
    }
    var result = new ValidationResult();
    result.Errors.Add("Invalid points");
    Equal(1, result.Errors.Count);
    var collection = new PerfectPitchTalents(new[] { new PerfectPitch() });
    Equal(1, collection.Count);
}
