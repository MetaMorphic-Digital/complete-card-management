# Changelog

## 2.0.7
- Increased system minimum to v13.346
- Fixed core i18n usage
- Fixed image display for cards with their backs up
- Privated various HUD actions to avoid API interaction confusion

## 2.0.6
- Reintroduced card count in the players list

## 2.0.5
- Added "View Card" button to decks
- Privated various sheet actions to avoid API interaction confusion

## 2.0.4
- v13.340 compatibility
- Added socket to allow players to place individual cards.
- Removed overrides for core pass, deal, reset, play, and draw dialogs.

## 2.0.3
- v13.339+ compatibility
- Updated internal type import handling
- Fixed ghost card bug (#136)
- Various i18n fixes

## 2.0.2
- Fixed errors that would occur if no scene was active on the canvas
- Fixed cards sheet drag and drop for v13.336+

## 2.0.1

- Migrated i18n usage to rely more on core, fixing some broken strings in the process
- Added German support

## 2.0.0 Foundry v13

- Increased minimum version to Foundry v13
- Many internal changes to achieve compatibility

## 1.0.2

- Changed the Deal dialog from a multi-checkbox to multi-select

## 1.0.1

- Removed `compatibility.systems` field from the module.json, allowing this module to be used with any system, not just SWADE and UTS. [#146]

## 1.0.0 Official Release

- Improved title on Card Sheet
- Added option to the allocate card region behavior to delete canvas cards dropped there (default: true)

## 0.9.1 Beta Release 2

### Additions

- You can set the primary owner of a card stack
- New client setting: "Show Card Owner Name"
- New hand sheet that is docked just above the hotbar
- Cards sheet now have a search bar to filter by name
- You can set a pile as the default for a scene's background
- Double left clicking a card on the canvas will create an image pop out. Double right click still opens its sheet.

### Fixes

- Fixed bad SVG blocking loading on firefox

## 0.9.0 Beta Release

### Additions

- `ccm.api.triangle` layout function
- Dragging a card onto a card stack will pass that card to the stack
- User config can now associate hands and the players list can show the number of cards in hand

### Fixes

- Proper sort handling on the canvas

## 0.8.1 Alpha Release 2

## 0.8.0 Alpha Release
