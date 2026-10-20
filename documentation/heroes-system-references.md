# HERO System References

This project models character data, not the rules text. The current model is locked to HERO System 5th Edition; generation rejects other edition identifiers rather than applying undocumented edition rules. Point-cost calculations remain limited to researched 5th-edition behavior.

## Character Sheets

- [HERO System 6th Edition Character Sheet](https://www.herogames.com/files/file/7-hero-system-6th-edition-character-sheet/) — official HERO Games download.
- [Champions Complete 3-Column Character Sheet](https://www.herogames.com/files/file/565-champions-complete-3-column-character-sheet/) — official HERO Games download.
- [HERO System 6th Edition Documents](https://www.herogames.com/files/category/13-hero-system-6th-edition-documents/) — official document directory; includes additional sheet formats such as the fillable and spreadsheet versions.
- [Champions 4th Edition Character-Sheet Discussion](https://www.herogames.com/forums/topic/96154-4th-edition-character-sheets/) — official HERO Games forum source for historical 4th-edition sheets.

### User-Provided 5th Edition Sheet Notes

The supplied 5th Edition sheet image shows three identity fields at the top: Character Name, Alternate Identities, and Player Name. Its Characteristics table groups Val, Char, Base, Cost, Points, Roll, and Notes; the visible rows include STR, DEX, CON, BODY, INT, EGO, PRE, and COM. A separate Combat Information block records Base OCV and Base DCV, adjustment fields, Total OCV and Total DCV, and Combat Skill Levels; Combat Maneuvers follows. Treat this as a field inventory for the character-sheet interface, not as a source for edition rules or point-cost formulas.

Continuation of the same sheet: identity, characteristics, and combat information belong to one character record. Keep the combat values grouped with that character; the screenshot does not define how those values are calculated.

The further continuation reaches the Combat Maneuvers heading. Its detailed fields are outside the supplied crop and remain undocumented until a clearer view is provided.

### Back-of-Sheet Continuation

The supplied reverse-side crop continues the same 5th Edition character sheet. It shows Character Information fields for Character Name, Height, Weight, Hair color, and Eye color; Campaign Information fields for Campaign name, Genre, and Gamemaster; a Skills, Perks, and Talents table with Cost, Name, and Roll columns; and a Powers and Equipment table with Cost, Name, Power/Equipment, and END columns. These are sections of the same character record. The field labels do not define point-cost calculations or other rules.

The remaining visible area continues those same tables with Total Skills, Perks & Talents Cost and Total Powers/Equipment Cost. It adds a Disadvantages section arranged in two side-by-side Cost, Disadvantage, and Roll groups, followed by Total Disadvantages Cost. The crop documents field organization only; it does not establish how totals, rolls, or disadvantage values are computed.

### User-Provided 5th Edition Base Sheet Notes

The supplied `Suburban Base` sheet is a base-object example, not a character sheet. Its layout pairs narrative description with a characteristics grid headed Val, Char, Base, Cost, Points, and Notes, followed by an Abilities & Equipment list with Cost, Powers, and END columns. Visible entries include traits such as BODY, DEF, and CON; retain these abbreviations as shown until their meanings are confirmed. Use this structure to guide a base editor: descriptive content, characteristic rows, and a costed abilities/equipment collection. Do not infer the meanings of abbreviations or cost formulas from the image alone.

## Rules and Definitions

- [HERO System 5th Edition, Revised — local reference PDF](Hero%20System%205th%20Ed%2C%20Revised.pdf) — user-provided complete rulebook in this documentation folder; consult for 5th-edition terminology and formula research. Do not copy substantial rules text into project documentation.
- [Intro to the HERO System](https://www.herogames.com/files/file/4-intro-to-the-hero-system/) — official free introductory PDF.
- [HERO System Basics](https://www.herogames.com/hero_system_basics.html/) — official overview.
- [Champions Complete](https://hero-system-games.itch.io/champions-complete) — publisher-operated authorized purchase page for the standalone 240-page Champions rules book.
- [HERO System 5th Edition Revised PDF](https://www.herogames.com/store/product/260-hero-system-5th-edition-revised-pdf/) — official HERO Games product listing.
- [HERO System Sidekick PDF](https://www.herogames.com/store/product/472-hero-system-sidekick-pdf/) — official streamlined rules reference.

The publisher search index describes character creation as covering Characteristics, Skills, Perks, Talents, Powers, Advantages, Limitations, and Disadvantages/Complications. The local 5th-edition rulebook is now the primary source for validating terminology and formulas. Keep calculations tied to documented 5th-edition rules and avoid copying substantial rules text. The 4th-edition sheet link above is a publisher-hosted forum reference; no 4th-edition core rulebook copy is currently recorded here.

## Local Object Workspace

The `/site/heroes/` page creates HERO worlds and objects without connecting to a Wurm world. It sends world and object definitions to the paired loopback helper, which stores them in a separate `heroes.db` file under the user's application-data directory (`WURM_HEROES_DB_PATH` can override the location). Object definitions are stored as JSON in SQLite without modifying Wurm databases. The editor offers generic objects, characters, player and non-player characters, bases, vehicles, equipment, animals, plants, automatons, computers, and AIs. Every kind uses the same object generator and typed HERO element catalog. Object model traits are derived from the selected object kind, displayed read-only, and cannot be overridden by imported trait values; typed elements can only be associated with traits supported by their object kind. The rules edition is fixed to 5th Edition. Point-level classifications offer model presets with their associated point values, plus a custom classification with an entered value. Typed characteristics/advantages/disadvantages feed the same character-element equation generator. Typed elements can be edited after insertion and marked as part of the base trait specification; the cleanup action removes only elements not marked as base. Worlds and individual objects can be exported/imported as versioned JSON backups, and deleting a world also deletes its objects.

The domain model supports nested package/framework elements and a 5th-edition figured-characteristic callback registry. The character generator also registers the concrete low-level element classes exported under `heroes/elements`, retains their instances on generated objects, and supplies entered primary characteristics to figured-characteristic calculations. Characteristic-based skills derive their base rolls from the characteristic class on the same character's shared `CharacterElements` collection: Agility skills use Dexterity, Interaction skills use Presence, and Intellect skills use Intelligence. Background and Combat skills have no characteristic base. These defaults are provided by the skill-category class hierarchy, not per-skill configuration. A figured element that requires missing characteristic inputs reports the missing dependency rather than silently substituting a value.

The 5th Edition callback IDs `physical-defense`, `energy-defense`, `speed`, `recovery`, `endurance`, and `stun` use the formulas and point rates in the local Revised rulebook (printed pp. 28 and 32–33). Their inputs and intermediate arithmetic remain exact; final values are rounded, with Speed rounded down. These callbacks are registered only for 5th Edition; generation rejects other edition identifiers until their formula sources are reviewed and the project explicitly adds support for them.

### 5th Edition Object-Cost Boundary

The local 5th Edition Revised reference (printed p. 85, “Buying Bases, Followers, and Vehicles”) makes Base and Vehicle acquisition a separate purchase from their construction, and describes purchaser-point-level effects and contributions from multiple purchasers. It also distinguishes a Vehicle purchase from a Base purchase. Accordingly, the editor keeps construction equations separate from a manually entered acquisition amount and notes; it does not calculate acquisition costs, infer an owner, or treat a Vehicle as a Base. This is a data boundary, not a claim that all object kinds use the same purchase rules.

The object-type labels beyond characters, Bases, and Vehicles are application taxonomy. They do not assert edition-specific costs or rules. The prior experimental `heroes/objects` class tree is not used by the page: its modules have unresolved imports and contain unverified type defaults and mechanics. It remains outside the selectable object-construction path until separately repaired and checked against a cited rules source. The project does not reproduce rulebook text.
