# HERO System — Development Todo & Roadmap

## Development Hold (2026-10-22)

All non-web development, including C#, Blazor, desktop hosts, native integrations, and engine migration, is **on hold until further notice from the user**. Preserve existing work; do not continue implementation, framework evaluation, or scaffolding in those areas. Only the current JavaScript HERO web tools and their supporting tests/documentation are active.

## Maximum Priority - Regression

- **Sheet-order acceptance criterion for task-208:** Match section order and element order within each section to the applicable HERO 5th Edition rules sheet for that object type (character, base, equipment, vehicle, and other available type-specific sheets). Do not apply character-sheet ordering universally. Consult and document the relevant sheet references; flag missing references rather than inventing an order. Ordering must arrange the actual inherited and added object elements, not introduce a hardcoded element list. Verify ordering for each type and after type switching and save/reload.

- [x] **CRITICAL: Restore dynamic inherited-element display for every object type.** The sheet now uses class-owned inherited elements plus added elements, with one authoritative body shape. DEF is suppressed only when both PD and ED are displayed. All selectable types, identity, JSON round trips, inline investments, and referenced sheet ordering are covered by regression checks; browser checks cover type switching and mocked-storage save/edit. Equipment and other missing sheet references are explicitly flagged instead of inventing an order. This supersedes the prior explicit-elements-only characteristic display decision. Persistent task: `task-208`; completed 2026-10-22.

## Completed

- [x] Keep element catalog labels and defense dependency priorities stable in minified production builds by using module export names instead of runtime class names; verify body-shape names and replacement in production preview.
- [x] Separate primary and figured characteristics on character sheets using class metadata; keep combat values in combat information and preserve non-character sheet grouping. Correct Running/Swimming/Leaping names, researched 5th Edition baselines and point rates, game-inch display, and Strength-based forward Leaping.
- [x] Use shared Thing names with classification, specification, and categorization names; model person, place, event, action, and description names from that shared parent.
- [x] Represent special effects as descriptions and model edition-aware advantages, disadvantages/complications, modifiers, characteristics, skills, talents, perks, powers, everyman skills, package deals, frameworks, and variable power pools.
- [x] Derive figured characteristics from points and primary characteristics; retain exact point values and calculate advantages + points = disadvantages.
- [x] Compose equation elements into reusable game objects and worlds, including body shapes, point-level classifications, and physical/sentient/mobile/player-character traits.
- [x] Record authorized character-sheet and rules references in `documentation/heroes-system-references.md`; do not reproduce copyrighted rules text.
- [x] Record the user-provided 5th Edition sheet's identity, characteristics, and combat-information field groups in `documentation/heroes-system-references.md`.
- [x] Record the same sheet's reverse-side character/campaign information, Skills/Perks/Talents and Powers/Equipment tables and totals, and Disadvantages table in `documentation/heroes-system-references.md`.
- [x] Add the HERO Worlds page and paired local-helper SQLite persistence in a database separate from all Wurm files.
- [x] Add edit/update flows for typed HERO elements, adjustable point values, model-trait associations, base-trait specification flags, and removal of non-base extras.
- [x] Compose package-deal children and framework powers as nested editable elements; package child point values contribute to the equation while framework-contained powers stay nested.
- [x] Add an edition-keyed figured-characteristic callback registry; callbacks receive exact point and primary-characteristic inputs plus the normalized edition.
- [x] Record the user-provided `Suburban Base` sheet as a base-object example with narrative description, characteristics, and Abilities & Equipment fields.
- [x] Build all selectable concrete object kinds through one object generator and the same typed HERO element/equation pipeline; derive model traits from the selected object kind.
- [x] Record Base/Vehicle acquisition separately from construction without inferring purchaser ownership or cost formulas; review the distinction against the local 5th Edition reference.
- [x] Confirm the concrete object catalog, explicit trait behavior, and rules-neutral acquisition boundary with the user.
- [x] Make world objects visible in the HERO page and verify create, edit, delete, import, export, and cascading world deletion in an isolated running-UI smoke test; keep pending typed-field validation from blocking object saves.
- [x] Use `heroes/objects` class-owned body-shape factories from supported generation; keep unrelated experimental constructor mechanics outside the generator.
- [x] Connect figured-characteristic formula IDs to 5th Edition callbacks for physical defense, energy defense, speed, recovery, endurance, and stun; preserve exact intermediates and leave unsourced editions unresolved.
- [x] Use typed element short names as sheet labels without assigning new meanings to abbreviations or adding inferred calculations.
- [x] Present character model entries in identity, characteristics, combat, skills/perks/talents, powers/equipment, disadvantages, and totals sections; identity and campaign notes use existing Description entries.
- [x] Present base model entries in narrative description, characteristics, abilities/equipment, and costs sections; construction/acquisition remain separate and no new cost formulas are inferred.
- [x] Derive Agility, Interaction, and Intellect skill base rolls through category-class characteristic references in the shared character element collection; keep Background and Combat skills unbased.
- [x] Derive immutable object model traits from the selected object kind and display them as read-only traits.
- [x] Lock character and object generation to 5th Edition; reject unsupported edition identifiers.
- [x] Provide 5th Edition point-level classification presets that set their modeled point values, with a separate custom classification option.

## Next

Calculations remain limited to existing, researched 5th Edition rules; labels do not imply undocumented formulas.

- [x] Explain local HERO Worlds pairing on the page, including the Wurm Tools helper pairing code and installing project dependencies; clarify that SQLite does not issue the code or require a separate server.

### Object and Character Model

- [x] Keep object model traits read-only and display only the traits derived from the selected object type.
- [x] Display all currently defined typed sheet elements, their generated values, and point costs/investments; allow direct point editing or full element editing. Hierarchy-supplied zero-point defaults remain tracked separately below.
- [x] Replace the body-shape string specification with an OOP body-shape model. Use it to represent general shape, components, hit locations, called shots, location-specific damage and disabling, and extra-limb changes or physical limitations that remove limbs like amputations.
- [x] Dynamically discover body-shape and body-part classes from the OOP model. Complete custom/compound anatomy composition, concrete nested serialization, and standalone authoring outside the object/character form. Save definitions in a shared local library across worlds; only saved custom/compound shapes are selectable for object generation. Reuse saved shapes and prior generated objects as independent copies or live references; updates refresh live uses on load/regeneration, and deletion converts saved references to current independent copies. Preserve one root shape and model-owned anatomy. Advanced anatomy details and saved-object revisions use validated model JSON; no rulebook hit-location statistics are invented by this builder.
- [ ] some body shapes should include - humanoid, bipedal, equestrian, canine, feline, quadropedal, nonpedal(the correct term for no legs, like a snake or snail), vehicle, surface area shape like a base, city/town, box, sphere, rod, compound shape, etc.
- [ ] The display of values, even if they are mixed value results, need to follow the rounding rules for display, they should never display mixed numbers as final values.
- [ ] note that the powers and skills are all the same function for points to value and the value has purpose for all of them. the configuration of each of these should match the cost structure as is in the rulebook. the result value may be a number of dice, a base/target roll, even a modifier to a different roll or umber of dice or value, etc.
- [ ] need to work out the skill tiers as tied from a familiarity to a knowledge or proficincy in the skill. these need to be tied together better as the game has them work, if you read the rules in detail.
- [ ] the specifications of the listed components need to be identified better in the OOP model, and retained in the OOP model nothing hardcoded outside the model. all the external hardcoded items need to be brought into the model withthe swiches for thier proper use.
- [ ] the customization capability needs to be expanded such as the ability to add more specifications to the different tiers of skills or even generic. these should be stored outsie a character for resuse in a world or campaigns in general.
- [x] Keep exactly one concrete body-shape element per generated object, sourced from its object-type class hierarchy; replace the previous element when the editor selects another shape. Preserve concrete anatomy classes on save/reload and replay linked changes from the unchanged baseline.
- [x] Display characteristics from the actual object list, including its class-owned inheritance and explicit additions; do not maintain a competing generator default-element table.
- [ ] Model powers that refer to characteristics or skills as relationships to those same element instances rather than detached copies.
- [ ] Allow one power instance to belong to multiple power categories without duplicating the power.
- [ ] Model rulebook-defined skill specifications as OOP elements and allow custom skill specifications in characters and other objects.
- [ ] there are md files for more specifications that have not been built as classes in the OOP model in the modules.
- [ ] Allow custom specifications for special effects.
- [ ] Review both generators for complete OOP ownership: move behavior into the highest appropriate shared object/domain method and remove generator-specific hard-coded domain behavior.
- [ ] Validate object and character generation against the 5th Edition rulebook before beginning interaction implementation.
- [ ] each body part in a body shape should have the following stats aligned with them in the OOP object model: random hit 3d6 Roll values, OCV Mod for called shot, STUNx, NStun, and BODYx. allof these values are to come from the rulebook.
- [ ] maximum priority: the page titles and themes should switch between Wurm and Heros, they are different games and the site should reflect this. The wurm tools is appropriate only for the wurm tools, the heros tools should be names as Heros Tools. The organization of Players divided into Game Masters and Players should be a page of its own and stored in the same local database, also extractable and importable into json files. a game master should have a page for the worlds created or maintained by that game master, with the ability to extract/import the entire collection of everything they work with or individual worlds/campaigns/genres, or even individual objects they maintain. there should be an appropriate tab breakdown of these elements to make this management easier. There should also have the same capability for a player to manage thier characters under various game masters, even if that game master is not one listed in this system. the game masters also on thier pages should have access to review and make notes into players subscribed into thier games, but also store characters even if the players are not stored in this tool.
- [ ] backlog item: the concept of the Heros Tools should be able to be converted into an API in the future.
- [ ] need to look into visitor / player / game master registration and user tracking features, as well as site admin. any secrets need to be protected and encrypted and never exposed.

### Object Interactions

- [ ] After generation is rulebook-aligned, define and implement OOP interaction methods for rule-defined combat, damaging/breaking objects, and non-combat actions.
- [ ] Validate object interactions against the 5th Edition rules before beginning genre-specific features.

### Genre Support

- [ ] Add genre models and player/Game Master assistance after object interactions are rulebook-aligned. Let Game Masters configure house rules and players use the selected Game Master's rules.
- [ ] Implement genres in order: Fantasy Hero, Western Hero, Star Hero, Pulp Fiction Hero, then Champions superheroic worlds that can build on the other genres.

### Engine Evolution - ON HOLD Until Further Notice

- [x] Establish a standalone, independently buildable C# domain subset with regression checks, without connecting it to the website.
- [x] Document host-neutral boundaries for future Blazor and desktop reuse; defer desktop framework selection and keep UI/platform dependencies outside the domain.
- [ ] Evaluate desktop hosts against the available **Windows and Fedora Linux/KDE** test environments. Fedora/KDE support must be considered explicitly, including packaging, native integration, and embedded web-view requirements. No Mac is available; do not claim tested macOS support. Record actual platform versions and display sessions during validation.
- [ ] When implementation begins, introduce shared application contracts and a Razor Class Library for actual use cases, then compose them from separate Blazor and desktop hosts. Select the desktop framework explicitly before scaffolding; keep storage, file dialogs, credentials, and native services in host adapters. Test shared behavior and each adapter independently. See the host-neutral boundaries in `README.md`.
- [ ] After object interactions and genre models are complete and rulebook-aligned, assess, plan, and implement migration of the OOP model and functionality to C#.
- [ ] After the C# implementation, assess turning the model into an object/character/world engine and integrating it with game engines such as Unreal.
- [ ] Keep HERO game-management behavior rule-compliant while exploring a separate game-design mode for scientifically grounded, realism-oriented rates and related concepts.
