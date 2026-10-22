# HERO System References

This project models character data, not the rules text. The current model is locked to HERO System 5th Edition; generation rejects other edition identifiers rather than applying undocumented edition rules. Point-cost calculations remain limited to researched 5th-edition behavior.

## Local Campaign Management

The Heros Tools management page uses the common C# IAM and HERO IAM code only as an architectural reference:
stable profile identities, multiple GM/Player roles, a world's owning Game Master and subscribed players,
and active/inactive campaigns. The deployed implementation is JavaScript, with relationship validation in
`campaign-management.mjs` and persistence in the existing local SQLite store. Its management records link
to the existing worlds and object definitions; they do not introduce another character model or duplicate
the object data.

Per user scope confirmation, profiles are organizational records protected by existing helper pairing,
not authenticated users. C# password derivation, account lockout, ACL evaluation, administrator bypass,
and present/effective-user impersonation have **not** been ported or simulated with browser-selected roles.
Every paired browser has the same local-data access, including all GM notes and exported JSON. Actual
account registration, authentication, authorization, and note confidentiality remain separate backlog work.
Non-web/C#/Blazor/desktop development remains on hold.

The upper navigation selects the world/object or people workspace. Context-specific sidebars open
separate HTML pages for worlds, genres, campaigns, other objects, NPCs, PCs, assignments, the shared
library, GMs, players, admins, and GM notes. Existing object-kind identifiers determine the editor
category; generic characters remain in Objects rather than being relabeled as NPCs. The same model,
storage, and editors serve all pages. World/profile URL context is organizational, never an ACL.
Per the subsequent user scope confirmation, the Admins page only explains deferred registration
and authorization; it exposes no administrator or permission-assignment functionality.

The organizational hierarchy is **Genre → Campaign → World**, per the user's correction.
Genres are first-class records; campaigns reference one genre and configured worlds reference one
campaign. These relationships are modeled and validated in JavaScript, not inferred in generators.
New or edited campaigns/world links require a parent. Unconfigured or legacy-unresolved worlds remain
available for manual configuration; missing legacy parents are explicitly flagged, not guessed.

Worlds can reference a local GM or an external GM label, and subscribe local player profiles. Saved
characters can link to a local player, external player label, or no player; external-GM characters can
still belong to a local player's collection. Character assignments select a world context and inherit
its campaign/genre; shared characters can have separate assignments in different worlds, or no world
context. GM notes require a locally assigned world GM and a subscribed player or an available character.
Deleting referenced profiles/genres/campaigns or removing subscriptions required by notes is rejected explicitly.
Deleting an object removes its assignment and character-only notes; combined player/character notes keep
the subscribed-player note without the removed character link. World deletion removes its management
links, world-only objects, world-context assignments, and notes, but retains parent campaigns/genres,
profiles, shared objects, and the shared definition library.

Object availability records reference the same saved object from any number of genres, campaigns,
and worlds, or make it global. Availability flows to descendant worlds. Global objects can be
created/imported without a world; world-only objects retain existing behavior until explicitly
assigned shared availability. Shared objects use nullable world storage, not a hidden placeholder
world, and edits are visible through every link. Deleting the last referenced world leaves a shared
object unassigned rather than deleting it or making it global. Availability is not authorization.

Version 1 local records and imported management backups are migrated to the corrected hierarchy.
Only unique world/campaign links are reversed; multiple old campaigns leave the world unresolved,
with candidate names/IDs recorded for manual selection. Old genre labels become genre records and
historical migration notes. A campaign without an old genre is flagged rather than assigned an
invented genre. Prior character campaign assignments are preserved in historical notes and their
world context is retained. The migration is atomic, persists once, and preserves object definitions.

Management collections are additive, versioned JSON backups with remapped IDs and validated dependencies.
World/campaign/genre/profile scopes include required context; they are not security boundaries. GM profile
collections include objects available in their owned worlds; player profiles include their assigned characters plus
subscribed world context, not unrelated characters. Individual object exports and existing world exports
retain their previous format and do not include management relationships. Portable object definitions
flatten live library references; the original reusable-definition library can be exported separately.
Genres and campaign labels do not enable unfinished genre-specific rules.

## Character Sheets

- [HERO System 6th Edition Character Sheet](https://www.herogames.com/files/file/7-hero-system-6th-edition-character-sheet/) — official HERO Games download.
- [Champions Complete 3-Column Character Sheet](https://www.herogames.com/files/file/565-champions-complete-3-column-character-sheet/) — official HERO Games download.
- [HERO System 6th Edition Documents](https://www.herogames.com/files/category/13-hero-system-6th-edition-documents/) — official document directory; includes additional sheet formats such as the fillable and spreadsheet versions.
- [Champions 4th Edition Character-Sheet Discussion](https://www.herogames.com/forums/topic/96154-4th-edition-character-sheets/) — official HERO Games forum source for historical 4th-edition sheets.

### User-Provided 5th Edition Sheet Notes

The supplied 5th Edition sheet image shows three identity fields at the top: Character Name, Alternate Identities, and Player Name. Its Characteristics table groups Val, Char, Base, Cost, Points, Roll, and Notes; the visible rows include STR, DEX, CON, BODY, INT, EGO, PRE, and COM. A separate Combat Information block records Base OCV and Base DCV, adjustment fields, Total OCV and Total DCV, and Combat Skill Levels; Combat Maneuvers follows. Treat this as a field inventory for the character-sheet interface, not as a source for edition rules or point-cost formulas.

Continuation of the same sheet: identity, characteristics, and combat information belong to one character record. Keep the combat values grouped with that character; the screenshot does not define how those values are calculated.

The further continuation reaches the Combat Maneuvers heading. Its detailed fields are outside the supplied crop and remain undocumented until a clearer view is provided.

### Sheet Ordering Used by the Editor

The character sheet follows the supplied front-to-back order and the local 5th Edition Revised sheets (printed/PDF pp. 591-592): identity; primary characteristics in the order STR, DEX, CON, BODY, INT, EGO, PRE, COM; figured characteristics in the order PD, ED, SPD, REC, END, STUN; combat information; combat maneuvers; Skills, Perks, and Talents; Powers and Equipment; Disadvantages; then totals. Characteristic class metadata determines the primary/figured grouping rather than a second list of element types. Combat-value elements remain in combat information; END remains with figured characteristics. Base, vehicle, and other non-character layouts keep their existing characteristic group. This is presentation metadata only: ordering never creates a missing element (for example, STUN is not inserted if the object class does not declare it).

The supplied Suburban Base example determines its narrative description, characteristics, Abilities & Equipment, and construction/acquisition section sequence. The local reference's base-characteristics table (p. 465) orders BODY before DEF; vehicle characteristics (p. 462) order STR, DEX, BODY, DEF, SPD. Animal examples (pp. 452-454) use character characteristic order; the computer example (p. 461) orders INT, DEX, SPD. These references order only matching elements; additional inherited or user-added elements keep their object order after the referenced rows. Full vehicle/computer/animal sheet layouts are not documented here, so their remaining sections retain generic grouping, explicitly labeled as such. No equipment-specific sheet reference has been verified; equipment and other undocumented types show a visible missing-reference notice and retain their object element order rather than claiming character-sheet or equipment-sheet compliance.

Each object's sheet comes from the generated object's actual element list: inherited elements declared by its own class hierarchy plus user-added elements. `defaultElements` declarations live on object classes, including composed physical/living/mobile/sentient inheritance; constructors and generation use the same declarations and deduplicate by concrete element class. The generator resolves those classes through the shared catalog, marks inserted entries as base/hierarchy defaults, and preserves an entered definition of the same type rather than adding a duplicate. The same typed list drives editing, equations, display, and persistence for every object type. Type changes remove hierarchy-only defaults absent from the new hierarchy while preserving shared investments and explicitly added extras. Body shape remains a single element with its existing replacement semantics.

When both PD and ED are displayed, DEF is hidden from the sheet only: the DEF instance remains in the object's list and calculations. With either defense missing, DEF remains visible. Generic physical DEF uses the object class's explicit zero-composition placeholder when no defensive dependency is present; nonliving mobile END uses its class-declared zero baseline when CON is absent. These are application model defaults, not rulebook vehicle/base armor values or a new fuel formula; full rules validation remains pending. Figured elements otherwise continue to report missing dependencies.

Primary-characteristic rows show the short name as a label and expose the full name on hover. Their value and points fields are both editable: entering a desired value derives the exact points from the characteristic's configured base value and value rate, while entering points recalculates the value through the model. Display rounding remains the characteristic model's responsibility. Other element kinds retain their model-specific value behavior and do not receive an assumed inverse cost formula.

### Basic Movement Powers

The local 5th Edition Revised rulebook gives Running a base of 6 game inches and a cost of 2 points per additional inch (p. 215); Swimming starts at 2 game inches and costs 1 point per additional inch (p. 228). Forward Leaping starts at STR / 5 game inches, with purchased distance added at 1 point per inch (pp. 34, 196). The displayed Leaping value is the forward leap, not the vertical leap or a noncombat multiple.

These defaults and rates belong to the concrete JavaScript power classes, not the web renderer. Running, Swimming, and Leaping retain their actual names/short names through the Power hierarchy, and their values display the game-inch mark (`"`). Leaping uses Strength from the same object's element collection and recalculates during generation after investments change; an explicit base value may override that dependency. Missing Strength without an explicit base reports an error. Explicit base/rate overrides remain supported; these basic defaults do not certify vehicle propulsion, movement modifiers, END use, or other unfinished movement mechanics.

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

The domain model supports nested package/framework elements and a 5th-edition figured-characteristic callback registry. Body shapes are OOP character elements with named shape types, concrete anatomy parts, nested components, hit-location instances, called shots that reference locations on the same shape, exact location-damage tracking, disabled-state descriptions, extra-limb records, and physical limitations that reference removed components.

### Shared Definition Library and Anatomy Builder

The independent library form on the HERO page discovers anatomy types from the JavaScript model exports, including custom and compound parts and shapes. Custom/compound authoring is not offered in the object generator's standard shape selector. Build and save anatomy in the library first, then select the saved definition for use. Names, general shape, shape types, part/shape composition, and removal are editable controls; the advanced JSON editor exposes the model's remaining component/location/limitation fields, which must be applied before saving. Compound shapes retain their child shapes rather than serializing a second flattened copy of their parts; compound parts retain concrete nested part types. Placement IDs keep repeated anatomy instances distinct.

Saved shapes, parts, and object templates share a `heroes_library` table in the existing local HERO database, independent of any world. Save an existing world object to the library to reuse it; later library edits are independent of that source object. Both object and character generation resolve the latest library definitions in the supplied library context. A saved shape replaces the sole root shape; a saved object is included through the existing domain object's `objects` collection without inventing acquisition costs or adding its characteristics to the parent.

Insertion offers an independent deep copy or a live `libraryRef`. Copies keep their saved values; live uses refresh when loaded/regenerated or when the library is refreshed. Anatomy library entries are editable with the builder; saved object templates are editable as validated object JSON. Missing or cyclic references report errors. Deleting a library definition first replaces its uses in saved world objects and other library definitions with current independent copies; the active editor also detaches its affected uses. World deletion does not delete the shared library. Library, object, and world exports resolve references into portable copies so imports do not depend on another database's library IDs.

These features add authenticated helper routes under `/heroes/library`. Restart the local helper after updating the application so those routes are available. Existing worlds and objects are preserved; the library table is created when the database is next opened. No C#, Blazor, desktop host, interaction rules, or unsourced hit-location statistics are included in this work.

Body-shape defaults belong to the `heroes/objects` class hierarchy through `createDefaultBodyShape()`, not a generator table: `GameObject` supplies `Ellipsoid`, `PhysicalObject` and `MobileObject` supply `RectangularParallelepiped`, `Character` supplies `Humanoid`, and `Animal` supplies `Quadruped`. Derived classes inherit those defaults: generic objects and AIs use Ellipsoid; characters, player characters, and non-player characters use Humanoid; animals use Quadruped; bases, vehicles, equipment, plants, automatons, and computers use RectangularParallelepiped. These are application class defaults, not newly inferred rulebook formulas.

Each generated object has exactly one root body-shape entry in `typedElements`. The generated-element map, `elementObjects`, and `bodyShape` getter reference the same concrete instance. `GameObject.Add(shape)` removes the old shape before adding its replacement. The editor's body-shape selector likewise replaces the old typed element; it does not define anatomy in a separate authoring area. Powers and disadvantages can add, remove, or change the presence of anatomy parts and components through linked changes. The serialized shape retains an unchanged `baseBodyShape` snapshot so regenerating replays effects once, and removing an effect restores the baseline. Concrete part classes survive JSON round trips. An absent part also makes its nested components absent. These links do not infer hit-location, damage, or called-shot mechanics. Links must refer to the selected shape and existing target parts; invalid links report errors rather than being silently retargeted during replacement. Duplicate shapes, shapes nested in packages/frameworks, and obsolete parallel `bodyShape`/`bodyShapes` inputs are rejected; no compatibility conversion is provided.

The character generator also registers the concrete low-level element classes exported under `heroes/elements`, retains their instances on generated objects, and supplies entered primary characteristics to figured-characteristic calculations. Characteristic-based skills derive their base rolls from the characteristic class on the same character's shared `CharacterElements` collection: Agility skills use Dexterity, Interaction skills use Presence, and Intellect skills use Intelligence. Background and Combat skills have no characteristic base. These defaults are provided by the skill-category class hierarchy, not per-skill configuration. A figured element that requires missing characteristic inputs reports the missing dependency rather than silently substituting a value.

The 5th Edition callback IDs `physical-defense`, `energy-defense`, `speed`, `recovery`, `endurance`, and `stun` use the formulas and point rates in the local Revised rulebook (printed pp. 28 and 32–33). Their inputs and intermediate arithmetic remain exact; final values are rounded, with Speed rounded down. These callbacks are registered only for 5th Edition; generation rejects other edition identifiers until their formula sources are reviewed and the project explicitly adds support for them.

### 5th Edition Object-Cost Boundary

The local 5th Edition Revised reference (printed p. 85, “Buying Bases, Followers, and Vehicles”) makes Base and Vehicle acquisition a separate purchase from their construction, and describes purchaser-point-level effects and contributions from multiple purchasers. It also distinguishes a Vehicle purchase from a Base purchase. Accordingly, the editor keeps construction equations separate from a manually entered acquisition amount and notes; it does not calculate acquisition costs, infer an owner, or treat a Vehicle as a Base. This is a data boundary, not a claim that all object kinds use the same purchase rules.

The object-type labels beyond characters, Bases, and Vehicles are application taxonomy. They do not assert edition-specific costs or rules. The page uses the `heroes/objects` class hierarchy for body-shape and inherited-element declarations, then constructs catalog elements in a shared dependency context. Direct constructors use the same declarations; their unrelated combat/interaction mechanics remain WIP and are not certified as complete by this integration. The project does not reproduce rulebook text.
