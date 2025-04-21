This is an Obsidian plugin designed to synchronize flashcards written in markdown notes with Mochi.cards. It allows you to use Obsidian as your primary editing environment for Mochi flashcards.

Core Functionality

Obsidian Plugin: Operates within Obsidian, accessible via Ribbon icon and Command Palette.
Mochi API Integration: Connects to your Mochi.cards account using an API Key (configured in settings) to add, update, and delete cards and upload associated media.
Change Tracking: Detects changes in your notes by comparing content hashes with previously synced versions, ensuring only modified content is processed.
ID Management: Writes Mochi card IDs back into your Obsidian notes (optionally as HTML comments) after creation, enabling future updates and deletions.
Supported Syntax & Features

Card Definition:
Block Cards: Uses configurable start/end markers (e.g., START...END) with the Mochi template name on the first line.
Inline Cards: Uses configurable start/end markers (e.g., STARTI...ENDI) for single-line definitions.
Custom Regex: Allows defining custom regular expressions in the settings to parse cards matching user-defined patterns. (Note: Specific syntax examples like Q:/A: style require configuring the corresponding regex in the plugin settings).
Content Parsing: Extracts fields based on FieldName: prefixes or regex capture groups. Recognizes optional Tags: and ID: lines/suffixes.
Formatting:
Converts Markdown content (including tables, lists, code blocks) to HTML using Showdown.
Includes code syntax highlighting via showdown-highlight.
Processes LaTeX math notation ($...$ and $$...$$) into Mochi-compatible format (\(...\) and \[...\]).
Supports Mochi cloze syntax ({{c1::...}}). Optionally converts {...} or {c1::...} syntax (and optionally ==highlight== syntax) to Mochi clozes if the template name includes "Cloze".
Media Handling: Detects embedded image and audio files (![[media.ext]]), uploads them to Mochi, and updates the card content to use Mochi's @media/... link.
Linking:
Converts Obsidian internal links ([[...]]) into obsidian:// HTML links.
Optionally appends a link back to the source Obsidian note onto a specified Mochi field.
Metadata:
Decks: Assign cards to decks using a TARGET DECK: line in the file (supports :: for nesting), folder-based settings, or a default deck. Creates deck hierarchies in Mochi if they don't exist.
Tags: Assign tags using a FILE TAGS: line, Tags: within card blocks, folder-based settings, or a default tag. Optionally converts Obsidian #tags within card fields to Mochi tags.
Context: Optionally appends the file path and heading structure (e.g., Path > H1 > H2) to a specified Mochi field.
Frozen Fields: Appends predefined content to specified fields using the FROZEN syntax in the note.
Card Management:
Updates: Edits existing cards in Mochi if the content in Obsidian has changed (based on hash comparison).
Deletions: Removes cards from Mochi when a DELETE ID: [Mochi Card ID] line is found in the note (the line is then removed from the note).
Configuration

Provides a detailed settings panel within Obsidian to configure:
Mochi API Key.
Syntax keywords (START, END, TARGET DECK, etc.).
Default deck, tag, and behavior toggles (Add File Link, Add Context, Cloze options, etc.).
Template-specific settings: Custom regex patterns, target fields for file links and context.
Folder-specific settings: Default deck and tags for notes within specific folders.
Buttons to clear internal caches (file hashes, card hashes, media links) or regenerate template settings after connecting to Mochi.
This plugin acts as a bridge, leveraging Obsidian's editing capabilities to populate your Mochi.cards collection based on the content and structure you define in your notes.