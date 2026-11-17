# Hyrule Tracker

The tracker is an Ocarina of Time field journal. Players consult it beside the game, on a second monitor, or on a phone. The prominent information is the source of the current progress, what remains in the area, and which objectives can be completed next.

## Visual language

- Energy 1, rhythm 2 and motion 2. Keep the progress summary and map as the main visual anchors. Let lists and grouped controls set the pace between them.
- Dark charcoal and brown surfaces keep the tracker subdued beside the game. Green identifies active navigation and confirmed connection. Gold marks progress and important map details. Pair status colors with text, icons or other cues.
- Darken the map artwork in the progress panel to keep the percentage legible. Use the sidebar line icons for navigation and in-game sprites to identify objectives.
- Use the existing Bahnschrift and Segoe UI system stack for the compact interface and system fallbacks for localized scripts. Keep percentage and count labels next to their numbers.
- Use the existing game item sprites, atlas imagery and map markers where they identify real items or locations. Keep screenshots and photos supporting the controls and progress they illustrate.

## Interaction

- Desktop uses a sidebar, with a compact rail in narrow and short windows. Phone portrait keeps the overview, available objectives, map and checklist in the bottom navigation.
- Give checklist filters their own panel. Leave space before the suggested objectives so the link reads as an action below the filters.
- Keep the active page and save status easy to find. Allow long translations to wrap and preserve focus when dismissing menus and dialogs.
- Bring in the new page content with a short fade and an 8 px rise while the header and navigation stay fixed in place. Navigation icons press in slightly on touch. Skeletons follow each page's layout and settle after two gentle pulses. Preserve live map updates with reduced motion enabled, and remove movement that only decorates the interface.
