# HERO System — Development Todo & Roadmap

Completed tasks, original requirements, implementation details, historical decisions, and verification notes are in the [completed-task archive](heroes-completed.md). The [Wurm Tools roadmap](todo.md) tracks the rest of the project.

## Development Hold (2026-10-22)

All non-web development, including C#, Blazor, desktop hosts, native integrations, and engine migration, is **on hold until further notice from the user**. Preserve existing work; do not continue implementation, framework evaluation, or scaffolding in those areas. Only the current JavaScript HERO web tools and their supporting tests/documentation are active.

## Maximum Priority — Regression Acceptance Criteria

- **Sheet-order acceptance criterion for task-208:** Match section order and element order within each section to the applicable HERO 5th Edition rules sheet for that object type (character, base, equipment, vehicle, and other available type-specific sheets). Do not apply character-sheet ordering universally. Consult and document the relevant sheet references; flag missing references rather than inventing an order. Ordering must arrange the actual inherited and added object elements, not introduce a hardcoded element list. Verify ordering for each type and after type switching and save/reload.

The completed critical inherited-element regression fix, its superseded decision, and its verification details remain in the [archive](heroes-completed.md#maximum-priority---regression).

## Next

Calculations remain limited to existing, researched 5th Edition rules; labels do not imply undocumented formulas.

### Installation and Updates

- [ ] **Maximum priority:** Build and maintain a downloadable, self-extracting installer to install or update a Fedora or Windows machine, selecting the download based on the OS reported by the browser. Instead of showing a message to restart the helper, offer the update download and let the installer determine and correct the laptop's current state. Rebuild this component whenever the code required on the laptop is updated.

### Object and Character Model

- [ ] Include body shapes such as humanoid, bipedal, equestrian, canine, feline, quadrupedal, legless (use the correct term for shapes such as a snake or snail), vehicle, surface-area shapes such as a base, city/town, box, sphere, rod, compound shape, etc.
- [ ] Display values according to the rounding rules, including mixed-value results; never display mixed numbers as final values.
- [ ] Powers and skills use the same points-to-value function, and the resulting value has a purpose for each. Configure each to match the rulebook's cost structure. Results may be a number of dice, a base/target roll, a modifier to another roll, a number of dice or another value, etc.
- [ ] Work out skill tiers and the links from familiarity to knowledge or proficiency in a skill. Tie them together more closely according to the detailed rules.
- [ ] Identify the listed components' specifications more clearly in the OOP model and retain them there, with nothing hard-coded outside the model. Move all externally hard-coded items into the model with the switches needed for their proper use.
- [ ] Expand customization, including additional specifications for different skill tiers or generic specifications. Store these outside individual characters for reuse in worlds or campaigns generally.
- [ ] Model powers that refer to characteristics or skills as relationships to those same element instances rather than detached copies.
- [ ] Allow one power instance to belong to multiple power categories without duplicating the power.
- [ ] Model rulebook-defined skill specifications as OOP elements and allow custom skill specifications in characters and other objects.
- [ ] Implement the additional specifications documented in Markdown files that have not yet been built as OOP classes in the modules.
- [ ] Allow custom specifications for special effects.
- [ ] Review both generators for complete OOP ownership: move behavior into the highest appropriate shared object/domain method and remove generator-specific hard-coded domain behavior.
- [ ] Validate object and character generation against the 5th Edition rulebook before beginning interaction implementation.
- [ ] Associate each body part in a body shape with the following statistics in the OOP object model: random-hit 3d6 roll values, OCV modifier for a called shot, STUNx, NStun, and BODYx. All values must come from the rulebook.

### Accounts, Sharing, and Future API

These remain open follow-ups to the completed account, navigation, publication, and subscription work in the [archive](heroes-completed.md). Moving them here does not mark them complete or change their scope.

- [ ] **Backlog:** Keep the Heros Tools concept capable of being converted into an API in the future.
- [ ] Investigate single sign-on, potentially tied to the local laptop login ID or browser authentication from other pages or sites, linked to an internal ID.
- [ ] Determine the ability to send a code by email and use it for email confirmation.
- [ ] A player's objects can go to some, all, or no GMs. Each object submitted to a GM requires that GM's approval independently of the player being in the GM's game.
- [ ] A GM can choose to publish items for players, publish them globally, or leave them unpublished.
- [ ] A GM needs the player's permission to share an object, even if the GM has approved its submission by the player.

### Object Interactions

- [ ] After generation is rulebook-aligned, define and implement OOP interaction methods for rule-defined combat, damaging/breaking objects, and non-combat actions.
- [ ] Validate object interactions against the 5th Edition rules before beginning genre-specific features.
- [ ] Voluntary account deletion should also allow the user to export all their data. Recovery by import requires system-administrator approval. All approvals on restoration must be recertified by GMs and other players.
- [ ] Involuntary deletion by a system administrator should allow a backup of all data to be stored and recovered.

Helper commands retained from the deletion note; the original note did not specify their relationship to that requirement:

```sh
npm run helper:stop
npm run helper
```

### Genre Support

- [ ] Add genre models and player/Game Master assistance after object interactions are rulebook-aligned. Let Game Masters configure house rules and players use the selected Game Master's rules.
- [ ] Implement genres in order: Fantasy Hero, Western Hero, Star Hero, Pulp Fiction Hero, then Champions superheroic worlds that can build on the other genres.

### Engine Evolution — ON HOLD Until Further Notice

Completed standalone C# foundations and host-neutral documentation remain in the [archive](heroes-completed.md#engine-evolution--completed-foundations-further-work-on-hold). The development hold above applies to every task in this section.

- [ ] Evaluate desktop hosts against the available **Windows and Fedora Linux/KDE** test environments. Fedora/KDE support must be considered explicitly, including packaging, native integration, and embedded web-view requirements. No Mac is available; do not claim tested macOS support. Record actual platform versions and display sessions during validation.
- [ ] When implementation begins, introduce shared application contracts and a Razor Class Library for actual use cases, then compose them from separate Blazor and desktop hosts. Select the desktop framework explicitly before scaffolding; keep storage, file dialogs, credentials, and native services in host adapters. Test shared behavior and each adapter independently. See the host-neutral boundaries in `README.md`.
- [ ] After object interactions and genre models are complete and rulebook-aligned, assess, plan, and implement migration of the OOP model and functionality to C#.
- [ ] After the C# implementation, assess turning the model into an object/character/world engine and integrating it with game engines such as Unreal.
- [ ] Keep HERO game-management behavior rule-compliant while exploring a separate game-design mode for scientifically grounded, realism-oriented rates and related concepts.
