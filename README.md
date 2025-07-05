# Clean Documenter

**Clean Documenter** is a Visual Studio Code extension that improves your code documentation by automatically detecting and correcting spelling mistakes inside comments. The best thing is that it is adaptable to your requirements, If you feel that the suggestions are not helpful, you can ignore them for a single word or even for the whole document. If you are in a hurry, use the auto-correct command to save time.

---

## Features

- Highlights misspelled words inside comments.
- Suggests correct spellings using dictionary-based suggestions.
- Auto-corrects all spelling errors in comments with a single command.
- Ignore individual words or all misspellings in a document for the current session.
- Supports JavaScript (`.js`), TypeScript (`.ts`, `.tsx`), and Plain Text (`.txt`).
- Real time document update for minor changes on document.

## How It Works

Using **Clean Documenter** in Visual Studio Code is easy:

1. **Install the Extension**

   - Open VS Code
   - Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
   - Search for **Clean Documenter**
   - Click **Install**

2. **Open a Supported File**

   The extension currently works with:

   - `.js`, `.ts`, `.tsx`, and `.txt` files

3. **Run a Spellcheck Command**

   Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and choose:

   - `Highlight Spelling Mistakes` – Underlines misspelled words in comments
   - `Auto Correct Spelling Mistakes` – Automatically replaces misspelled words with the best suggestion

4. **Quick Fixes on Hover**

   - Hover over an underlined word to see suggestions
   - Click the lightbulb 💡 to:
     - Replace it with a suggested word
     - Ignore the word for the current session
     - Ignore all spelling mistakes in the current file

5. **Session-based Ignoring**

   - Ignored words are remembered only for your current VS Code session
   - Closing VS Code will reset the ignored list

### Identifiers Aware

Does **not** flag misspellings for:

- Variable names
- Functions
- Classes
- Programming Artefacts

### Dictionary-Based Spellchecking

Utilizes `typo-js` with Hunspell `.aff` and `.dic` dictionary files for English (US).

### Smart Word Splitting

Comment text is split by spaces, commas, brackets, underscores, and ignores full stops for better detection.

---

## Author

**Shalok Sharma**

Publisher of _Clean Documenter_

## License

MIT License. Use freely and improve your documentation hygiene!

## Tip

If you're working with codebases with domain-specific terms or abbreviations, use the **Ignore Word** or **Ignore All** feature to prevent unnecessary flags.

## Future Scope

Clean Documenter is just getting started. Here are some features planned for future releases:

### Multi-Language Support

Currently, Clean Documenter supports JavaScript, TypeScript, and plaintext files. Future updates will extend this to include a wider range of popular programming languages, ensuring developers across ecosystems benefit from clean, consistent, and mistake-free documentation.

### Improved Dictionary

The dictionary system will be enhanced for better accuracy and richer word coverage:

- Use of more comprehensive and up-to-date dictionaries
- Better support for technical and domain-specific terminology (e.g. medical, legal, programming-specific terms)

### Dynamic Dictionary Management

Users will be able to:

- Add custom words to a **persistent ignore list** or **personal dictionary**
- Sync their custom dictionaries across sessions and machines
- Import/export dictionary files

These improvements will help reduce false positives and make the extension more adaptable to your coding style and vocabulary.
