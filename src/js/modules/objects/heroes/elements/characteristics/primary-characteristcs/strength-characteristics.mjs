import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Strength extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof Strength);
  }
  // lift is in kg
  static strength = {
    '-25': {
      lift: 0.8,
      damage: '0',
      leap: '0',
      ref: 'Dagger,javelin,grenade',
    },
    '-23': {
      lift: 1.0,
      damage: '0',
      leap: '0',
      ref: 'Pistol,laser pistol',
    },
    '-20': {
      lift: 1.6,
      damage: '0',
      leap: '0',
      ref: 'Pineapple,binoculars,longsword',
    },
    '-18': {
      lift: 2.0,
      damage: '0',
      leap: '0',
      ref: 'Clay brick',
    },
    '-15': {
      lift: 3.2,
      damage: '0',
      leap: '0',
      ref: 'Submachine gun, helmet',
    },
    '-13': {
      lift: 4.0,
      damage: '0',
      leap: '0',
      ref: 'Rifle, VCR, small metal shield',
    },
    '-10': {
      lift: 6.4,
      damage: '0',
      leap: '0',
      ref: 'Assult rifile,heavy crossbow',
    },
    '-8': {
      lift: 8.0,
      damage: '0',
      leap: '0',
      ref: 'Shotput, greatsword',
    },
    '-5': {
      lift: 12.5,
      damage: '0',
      leap: '0',
      ref: 'Machine gun, chainmail hauberk',
    },
    '-3': {
      lift: 16.0,
      damage: '0',
      leap: '0',
      ref: 'Tavern bench',
    },
    0: {
      lift: 25.0,
      damage: '0',
      leap: '0',
      ref: 'Full suitcase, TV set, bicycle',
    },
    3: {
      lift: 37.0,
      damage: '1/2',
      leap: '1/2',
      ref: 'Small refrigerator, plate armor',
    },
    5: {
      lift: 50.0,
      damage: '1',
      leap: '1',
      ref: 'Adolescent human, recliner',
    },
    8: {
      lift: 75.0,
      damage: '1 1/2',
      leap: '1 1/2',
      ref: 'Brass bed, washing machine',
    },
    10: {
      lift: 100.0,
      damage: '2',
      leap: '2',
      ref: 'Adult human',
    },
    13: {
      lift: 150.0,
      damage: '2 1/2',
      leap: '2 1/2',
      ref: 'Refrigerator',
    },
    15: {
      lift: 200.0,
      damage: '3',
      leap: '3',
      ref: 'Two men, piano, motocycle, boar',
    },
    18: {
      lift: 300.0,
      damage: '3 1/2',
      leap: '3 1/2',
      ref: 'Medium floor safe',
    },
    20: {
      lift: 400.0,
      damage: '4',
      leap: '4',
      ref: 'Chariot, grizzly bear',
    },
    23: {
      lift: 600.0,
      damage: '4 1/2',
      leap: '4 1/2',
      ref: 'Sailboat, cow, horse',
    },
    25: {
      lift: 800.0,
      damage: '5',
      leap: '5',
      ref: 'Sportscar, horse and rider',
    },
    28: {
      lift: 1200.0,
      damage: '5 1/2',
      leap: '5 1/2',
      ref: 'Medium missle',
    },
    30: {
      lift: 1600.0,
      damage: '6',
      leap: '6',
      ref: 'Small car, large missle',
    },
    35: {
      lift: 3200.0,
      damage: '7',
      leap: '7',
      ref: 'Truck, limousine',
    },
    40: {
      lift: 6400.0,
      damage: '8',
      leap: '8',
      ref: 'Small jet, large elephant',
    },
    45: {
      lift: 11350.0, //12.5 tons
      damage: '9',
      leap: '9',
      ref: 'Jetfighter, subway car',
    },
    50: {
      lift: 22680.0, //25.0 tons
      damage: '10',
      leap: '10',
      ref: 'Frigate, small standing stone',
    },
    55: {
      lift: 45360.0, //50.0 tons
      damage: '11',
      leap: '11',
      ref: 'Bulldozer, main battle tank',
    },
    60: {
      lift: 90718.5, //100.0 tons
      damage: '12',
      leap: '12',
      ref: 'Space Shuttle, blue whale',
    },
    65: {
      lift: 181437.0, //200.0 tons
      damage: '13',
      leap: '13',
      ref: 'Statue of Liberty',
    },
    70: {
      lift: 362874.0, //400.0 tons
      damage: '14',
      leap: '14',
      ref: 'Trawler, large starship',
    },
    75: {
      lift: 725748.0, //800.0 tons
      damage: '15',
      leap: '15',
      ref: 'Drilling rig',
    },
    80: {
      lift: 1451496.0, //1.6 ktons
      damage: '16',
      leap: '16',
      ref: 'Small bridge, freighter (unloaded)',
    },
    85: {
      lift: 2902992.0, //3.2 ktons
      damage: '17',
      leap: '17',
      ref: 'freighter (loaded)',
    },
    90: {
      lift: 5805984.0, //6.4 ktons
      damage: '18',
      leap: '18',
      ref: 'destroyer (unloaded)',
    },
    95: {
      lift: 11339812.5, //12.5 ktons
      damage: '19',
      leap: '19',
      ref: 'temple',
    },
    100: {
      lift: 22679625.0, //25.0 ktons
      damage: '20',
      leap: '20',
      ref: 'Large bridge, castle',
    },
  };
  static throwing = {
    0: { extraRunning: '0', standing: '0', prone: '0' },
    3: { extraRunning: '2', standing: '1', prone: '1/2' },
    5: { extraRunning: '4', standing: '2', prone: '1' },
    8: { extraRunning: '6', standing: '3', prone: '1 1/2' },
    10: { extraRunning: '8', standing: '4', prone: '2' },
    13: { extraRunning: '10', standing: '5', prone: '2 1/2' },
    15: { extraRunning: '12', standing: '6', prone: '3' },
    18: { extraRunning: '14', standing: '7', prone: '3 1/2' },
    20: { extraRunning: '16', standing: '8', prone: '4' },
    23: { extraRunning: '18', standing: '9', prone: '4 1/2' },
    25: { extraRunning: '20', standing: '10', prone: '5' },
    28: { extraRunning: '22', standing: '11', prone: '5 1/2' },
    30: { extraRunning: '24', standing: '12', prone: '6' },
    35: { extraRunning: '28', standing: '14', prone: '7' },
    40: { extraRunning: '32', standing: '16', prone: '8' },
    45: { extraRunning: '36', standing: '18', prone: '9' },
    50: { extraRunning: '40', standing: '20', prone: '10' },
    55: { extraRunning: '44', standing: '22', prone: '11' },
    60: { extraRunning: '48', standing: '24', prone: '12' },
    65: { extraRunning: '52', standing: '26', prone: '13' },
    70: { extraRunning: '56', standing: '28', prone: '14' },
    75: { extraRunning: '60', standing: '30', prone: '15' },
    80: { extraRunning: '64', standing: '32', prone: '16' },
    85: { extraRunning: '68', standing: '34', prone: '17' },
    90: { extraRunning: '72', standing: '36', prone: '18' },
    95: { extraRunning: '76', standing: '38', prone: '19' },
    100: { extraRunning: '80', standing: '40', prone: '20' },
  };
  /**
   * Calculates the extra strength a character has over the required weight.
   * @param {number} currentScore - The character's current strength score.
   * @param {number} itemWeightKg - The weight of the item being lifted.
   * @returns {number} The surplus strength score (can be negative if they aren't strong enough).
   */
  #extraStrengh(score, weight) {
    const requiredScore = this.#strengthRequired(weight);
    return score - requiredScore;
  }
  #throwing(score, weight) {
    let extraScore = this.#extraStrengh(score, weight);
    if (extraScore < 0) {
      extraScore = 0;
    }
    // Standing is always exactly Strength * 0.4 rounded down
    const standing = Math.floor(extraScore * '4/10');
    return {
      running: standing * 2,
      standing: standing,
      prone: standing * '1/2',
    };
  }

  #damageAndLeap(score) {
    if (score < 3) return '0';
    // Breaks down values cleanly into whole numbers and standard fractions
    const baseValue = (score - 0) / 5;
    const whole = Math.floor(baseValue);
    const fraction = baseValue - whole;
    if (fraction === 0) return `${whole}`;
    if (fraction === 0.6) return `${whole} 1/2`; // Handles the off-step offsets (3, 8, 13, 18, 23, 28)
    return `${whole}`;
  }
  /**
   * RANGE 1: Negative & Low-Tier Metric Progression
   * Valid for scores: -25 to 0
   * Uses continuous exponential growth anchoring at score 0 = 25 kg.
   */
  #liftLowRange(score) {
    const anchorScore = 0;
    const anchorValue = 25.0;

    return anchorValue * Math.pow(2, (score - anchorScore) / 10);
  }

  /**
   * RANGE 2: Mid-Tier Heroic Progression
   * Valid for scores: 1 to 40
   * Uses a slightly shifted base line where score 10 = 100 kg and score 20 = 400 kg.
   */
  #liftMidRange(score) {
    const anchorScore = 10;
    const anchorValue = 100.0;

    return anchorValue * Math.pow(2, (score - anchorScore) / 5);
  }

  /**
   * RANGE 3: High-Tier Ton-Scale Progression
   * Valid for scores: 45 to 100
   * Continuous progression cleanly based on the 100 Short Ton anchor (90718.474 kg) at score 60.
   */
  #liftHighRange(score) {
    const anchorScore = 60;
    const anchorValue = 90718.474; // 100 US Short Tons in kg

    return anchorValue * Math.pow(2, (score - anchorScore) / 5);
  }
  #liftKg(score) {
    if (score <= 0) return this.#liftLowRange(score);
    if (score <= 40) return this.#liftMidRange(score);
    return this.#liftHighRange(score);
  }
  /**
   * INVERSE RANGE 1: Negative & Low-Tier Metric Progression
   * Solves for score given a weight <= 25.0 kg
   */
  #strengthLowRange(weightKg) {
    const anchorScore = 0;
    const anchorValue = 25.0;
    return anchorScore + 10 * Math.log2(weightKg / anchorValue);
  }
  /**
   * INVERSE RANGE 2: Mid-Tier Heroic Progression
   * Solves for score given a weight between 25.0 kg and 6400.0 kg
   * (Score 40 produces 100 * 2^((40-10)/5) = 100 * 2^6 = 6400 kg)
   */
  #strengthMidRange(weightKg) {
    const anchorScore = 10;
    const anchorValue = 100.0;
    return anchorScore + 5 * Math.log2(weightKg / anchorValue);
  }

  /**
   * INVERSE RANGE 3: High-Tier Ton-Scale Progression
   * Solves for score given a weight > 6400.0 kg
   */
  #strengthHighRange(weightKg) {
    const anchorScore = 60;
    const anchorValue = 90718.474;
    return anchorScore + 5 * Math.log2(weightKg / anchorValue);
  }
  /**
   * Calculates the exact required strength score needed to lift a given weight in kg.
   * @param {number} weightKg - The weight of the object to lift.
   * @returns {number} The required strength score (floating-point).
   */
  #strengthRequired(weightKg) {
    if (weightKg <= 0) return -Infinity; // Cannot require strength for weightless/negative mass
    if (weightKg <= 25.0) return this.#strengthLowRange(weightKg);
    if (weightKg <= 6400.0) return this.#strengthMidRange(weightKg);
    return this.#strengthHighRange(weightKg);
  }

  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1',
      Name: 'Strength',
      ShortName: 'STR',
    });
  }
  EffectiveStrength() {
    return this.EffectiveCharacteristic();
  }
  StrengthRoll() {
    return this.CharacteristicRoll();
  }
  EffectiveStrengthRoll() {
    return this.EffectiveCharacteristicRoll();
  }
  BaseHTHDamage() {
    return this.#damageAndLeap(this.Value());
  }
  BaseEffectiveHTHDamage() {
    return this.#damageAndLeap(this.EffectiveStrength());
  }
  BaseLeap() {
    return this.#damageAndLeap(this.Value());
  }
  BaseEffectiveLeap() {
    return this.#damageAndLeap(this.EffectiveStrength());
  }
  LiftKg() {
    return this.#liftKg(this.Value());
  }
  EffectiveLiftKg() {
    return this.#liftKg(this.EffectiveStrength());
  }
  StrengthRequired(weightKg) {
    return this.#strengthRequired(weightKg);
  }
  ProneThrow(weight) {
    return this.#throwing(this.Value(), weight)['prone'];
  }
  ProneEffectiveThrow(weight) {
    return this.#throwing(this.EffectiveStrength(), weight)['prone'];
  }
  StandingThrow(weight) {
    return this.#throwing(this.Value(), weight)['standing'];
  }
  StandingEffectiveThrow(weight) {
    return this.#throwing(this.EffectiveStrength(), weight)['standing'];
  }
  RunningThrow(weight) {
    return this.#throwing(this.Value(), weight)['running'];
  }
  RunningEffectiveThrow(weight) {
    return this.#throwing(this.EffectiveStrength(), weight)['running'];
  }
}
/** @extends {Collection<Strength>} */
export class StrengthCharacteristics extends Collection {}
