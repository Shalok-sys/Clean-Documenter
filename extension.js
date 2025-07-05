const vscode = require("vscode");
const fs = require("fs");
const Typo = require("typo-js");

let dictionary; // Global variable dictionary will be used for detecting and correcting words within the comments.

// The function loads and returns the dictionary that is correctly initialized with .aff and .dic files.
function loadDictionary(context) {
  // Takes context as a parameter to access functionalities to this extension.
  if (!dictionary) {
    const affPath = context.asAbsolutePath("./dictionaries/en_US/en_US.aff");
    const dicPath = context.asAbsolutePath("./dictionaries/en_US/en_US.dic");
    dictionary = new Typo(
      "en_US",
      fs.readFileSync(affPath, "utf-8"),
      fs.readFileSync(dicPath, "utf-8")
    );
  }
  return dictionary;
}

// Helper function to remove all comments from the code (single-line and multi-line)
function removeComments(code) {
  return code.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, "");
}

// This function extracts identifiers from code ignoring comments.
// Function calls include the parentheses and their arguments as a string.
function extractIdentifiers(code) {
  const identifiers = new Set();

  // Remove comments first
  const codeWithoutComments = removeComments(code);

  // Extract declarations
  const identifierRegex =
    /\b(function|let|const|var|class)\s+([a-zA-Z_$][\w$]*)/g;
  let match;
  while ((match = identifierRegex.exec(codeWithoutComments)) !== null) {
    identifiers.add(match[2]);
  }

  // Extract function calls with arguments inside parentheses
  // This matches a function name followed by parentheses including anything inside (non-greedy)
  const funcCallRegex = /\b([a-zA-Z_$][\w$]*)\s*\(([^)]*?)\)/g;
  while ((match = funcCallRegex.exec(codeWithoutComments)) !== null) {
    const fullCall = `${match[1]}(${match[2]})`;
    identifiers.add(fullCall);
  }

  return identifiers;
}

// This function is responsible for extracting all the comments from the code.
function extractComments(code) {
  const commentRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm; // Holy grail #3 of the code for detecting comments from the code.
  let comments = [];
  let match;
  while ((match = commentRegex.exec(code)) !== null) {
    comments.push({ text: match[0], index: match.index });
  }
  return comments;
}

// This function is used to replace non-alphabetic characters with white space. Will be used later for simplifying the process of findng the correct word.
function cleanWord(word) {
  return word.replace(/[^a-zA-Z]/g, "");
}

// This function stores the misspelled words and uses identifiers and ignored words to ignore checking spelling mistakes in programming artefacts.
function findMisspelledWords(text, identifiers, dictionary, ignoredWords) {
  const misspelled = [];
  const words = text
    .split(/[,\s]+/)
    .map((w) => w.replace(/\./g, ""))
    .filter(Boolean);
  for (const word of words) {
    if (identifiers.has(word)) continue; // Skip identifiers immediately

    const cleaned = cleanWord(word);
    if (
      cleaned.length > 2 &&
      !identifiers.has(cleaned) && // optional, but safe fallback
      !ignoredWords.has(cleaned) &&
      !dictionary.check(cleaned)
    ) {
      const suggestions = dictionary.suggest(cleaned);
      misspelled.push({ original: word, cleaned, suggestions });
    }
  }

  return misspelled;
}

// A function that is called to display suggestion for incorrect spellings in the comments.
function provideHoverMessage(suggestions) {
  if (suggestions.length === 0) {
    return "No suggestions available.";
  }
  return "Suggestions: " + suggestions.join(", ");
}

// Entry point for the extension. The context object gives access to extension's lifecycle and API.
function activate(context) {
  // This collection is used to manage and display diagnostics (errors, warnings, information messages) in the VS Code editor.
  let diagnosticCollection =
    vscode.languages.createDiagnosticCollection("spellcheck");
  // Recheck spelling when document changes
  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;

    const doc = editor.document;
    if (
      doc.languageId === "plaintext" ||
      doc.languageId === "javascript" ||
      doc.languageId === "typescript"
    ) {
      const code = doc.getText();
      const dict = loadDictionary(context);
      const identifiers = extractIdentifiers(code);
      const comments = extractComments(code);

      diagnosticCollection.clear();

      /** @type {vscode.Diagnostic[]} */
      const diagnostics = [];

      for (const comment of comments) {
        const misspelledWords = findMisspelledWords(
          comment.text,
          identifiers,
          dict,
          ignoredWords
        );

        for (const { original, cleaned, suggestions } of misspelledWords) {
          const startIndex = comment.text.indexOf(original);
          if (startIndex < 0) continue;

          const startPos = doc.positionAt(comment.index + startIndex);
          const endPos = doc.positionAt(
            comment.index + startIndex + original.length
          );

          const range = new vscode.Range(startPos, endPos);
          const message = provideHoverMessage(suggestions);
          const diagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.code = cleaned;
          diagnostics.push(diagnostic);
        }
      }

      diagnosticCollection.set(doc.uri, diagnostics);
    }
  });

  // Track ignored words during this session
  const ignoredWords = new Set();

  // Command to highlight misspelled words in comments
  const disposableHighlight = vscode.commands.registerCommand(
    "clean-documenter.highlightMisspellings",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const doc = editor.document;
      if (
        // The extension is limited to these programming languages only at the moment. Won't work on anything else expect .js/.tsx/.txt files.
        doc.languageId === "plaintext" ||
        doc.languageId === "javascript" ||
        doc.languageId === "typescript"
      ) {
        const code = doc.getText();
        const dict = loadDictionary(context);
        const identifiers = extractIdentifiers(code);
        const comments = extractComments(code);

        diagnosticCollection.clear(); // Ensures that only the collection is with respect to the current text that is present in the code.

        // Less prone to errors by defining the type of the diagnostic collection variable.
        /** @type {vscode.Diagnostic[]} */
        let diagnostics = [];

        for (const comment of comments) {
          const misspelledWords = findMisspelledWords(
            comment.text,
            identifiers,
            dict,
            ignoredWords
          );

          for (const { original, cleaned, suggestions } of misspelledWords) {
            const startIndex = comment.text.indexOf(original);
            if (startIndex < 0) continue;

            const startPos = doc.positionAt(comment.index + startIndex);
            const endPos = doc.positionAt(
              comment.index + startIndex + original.length
            );

            const range = new vscode.Range(startPos, endPos); // This range is used to highlight the specific misspelled word with starting and end point.
            const message = provideHoverMessage(suggestions);
            const diagnostic = new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            );
            diagnostic.code = cleaned; // Used later by another functionality to ignore all the spelling mistakes.
            diagnostics.push(diagnostic);
          }
        }

        diagnosticCollection.set(doc.uri, diagnostics); // This is what makes the squiggles appear in the document.
        vscode.window.showInformationMessage("Spellcheck highlights updated!");
      } else {
        vscode.window.showInformationMessage(
          "Unsupported language for spellcheck"
        );
      }
    }
  );

  // Command to auto-correct all misspelled words in comments
  const disposableFixAll = vscode.commands.registerCommand(
    "clean-documenter.autoCorrectComments",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const doc = editor.document;
      if (
        doc.languageId === "plaintext" ||
        doc.languageId === "javascript" ||
        doc.languageId === "typescript"
      ) {
        const code = doc.getText();
        const dict = loadDictionary(context);
        const identifiers = extractIdentifiers(code);
        const comments = extractComments(code);

        const workspaceEdit = new vscode.WorkspaceEdit(); // The object workspace edit is used to apply multiple edits to one or more documents at a time.

        for (const comment of comments) {
          let updatedComment = comment.text;
          const misspelledWords = findMisspelledWords(
            comment.text,
            identifiers,
            dict,
            ignoredWords
          );

          for (const { original, cleaned, suggestions } of misspelledWords) {
            if (suggestions.length > 0) {
              const fixed = suggestions[0];
              const regex = new RegExp(`\\b${cleaned}\\b`, "g");
              updatedComment = updatedComment.replace(regex, fixed);
            }
          }

          if (updatedComment !== comment.text) {
            const startPos = doc.positionAt(comment.index);
            const endPos = doc.positionAt(comment.index + comment.text.length);
            const range = new vscode.Range(startPos, endPos); // Here the range is calculated for the whole comment instead of the word.
            workspaceEdit.replace(doc.uri, range, updatedComment); // That comment is replaced by a fully updated comment.
          }
        }

        await vscode.workspace.applyEdit(workspaceEdit); // This is an atomic operation, where all changes are applied together or none of them are.
        vscode.window.showInformationMessage("Comments auto-corrected!");
      } else {
        vscode.window.showInformationMessage(
          "Unsupported language for spellcheck"
        );
      }
    }
  );

  // CodeActionProvider for Quick Fix suggestions + Ignore option + Mass Ignore
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file", language: "*" }, // Apply to all file types initially, refined by languageId check
      {
        provideCodeActions(document, range, context) {
          const actions = [];

          // Add "Ignore All Misspellings in Document" action
          const ignoreAllAction = new vscode.CodeAction(
            "Ignore All Misspellings in Document (Session Only)",
            vscode.CodeActionKind.QuickFix
          );
          ignoreAllAction.command = {
            title: "Ignore all spellcheck warnings",
            command: "clean-documenter.ignoreAllMisspellings",
            arguments: [document.uri], // Pass the document URI
          };
          // Make it available if there's at least one diagnostic from our collection
          if (diagnosticCollection.get(document.uri)?.length > 0) {
            actions.push(ignoreAllAction);
          }

          for (const diagnostic of context.diagnostics) {
            const message = diagnostic.message;
            if (
              !message.startsWith("Suggestions: ") &&
              !message.startsWith("No suggestions available.")
            )
              continue;

            const suggestions = message
              .replace("Suggestions: ", "")
              .split(", ")
              .filter((s) => s.trim());
            // Use diagnostic.code to get the cleaned word
            const misspelledWord = diagnostic.code;

            if (ignoredWords.has(misspelledWord)) {
              continue; // skip ignored words for individual fixes
            }

            // Suggestion replacements
            for (const suggestion of suggestions) {
              if (suggestion === "No suggestions available.") {
                break;
              }
              const action = new vscode.CodeAction(
                `Replace with "${suggestion}"`,
                vscode.CodeActionKind.QuickFix
              );

              action.edit = new vscode.WorkspaceEdit();
              action.edit.replace(document.uri, diagnostic.range, suggestion);

              action.command = {
                title: "Clear spelling diagnostic",
                command: "clean-documenter.clearDiagnostic",
                arguments: [document.uri, diagnostic],
              };

              action.diagnostics = [diagnostic];
              action.isPreferred = true;

              actions.push(action);
            }

            // Ignore word action
            const ignoreAction = new vscode.CodeAction(
              `Ignore "${misspelledWord}" (Session Only)`,
              vscode.CodeActionKind.QuickFix
            );
            ignoreAction.command = {
              title: "Ignore word",
              command: "clean-documenter.ignoreWord",
              arguments: [document.uri, diagnostic, misspelledWord],
            };
            ignoreAction.diagnostics = [diagnostic];
            actions.push(ignoreAction);
          }

          return actions;
        },
      },
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      }
    )
  );

  // Command to clear individual diagnostic after fix
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "clean-documenter.clearDiagnostic",
      (uri, diagnosticToRemove) => {
        const existing = diagnosticCollection.get(uri);
        if (!existing) return;
        const updated = existing.filter((d) => d !== diagnosticToRemove);
        diagnosticCollection.set(uri, updated);
      }
    )
  );

  // Command to ignore a word and remove its diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "clean-documenter.ignoreWord",
      (uri, diagnosticToRemove, word) => {
        ignoredWords.add(word); // Add to session-based ignored words
        vscode.window.showInformationMessage(
          `"${word}" ignored for this session.`
        );
        const existing = diagnosticCollection.get(uri);
        if (!existing) return;
        const updated = existing.filter((d) => d !== diagnosticToRemove);
        diagnosticCollection.set(uri, updated);
      }
    )
  );

  // Command to ignore all current misspellings in the document
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "clean-documenter.ignoreAllMisspellings",
      (uri) => {
        const diagnosticsForDoc = diagnosticCollection.get(uri);
        if (!diagnosticsForDoc) {
          vscode.window.showInformationMessage("No misspellings to ignore.");
          return;
        }

        let wordsIgnoredCount = 0;
        diagnosticsForDoc.forEach((diagnostic) => {
          // Assuming diagnostic.code holds the cleaned word, as added in highlightMisspellings
          if (diagnostic.code && !ignoredWords.has(diagnostic.code)) {
            ignoredWords.add(diagnostic.code);
            wordsIgnoredCount++;
          }
        });

        diagnosticCollection.clear(); // Clear all diagnostics for the document
        vscode.window.showInformationMessage(
          `Ignored ${wordsIgnoredCount} unique words for this session.`
        );
      }
    )
  );

  context.subscriptions.push(disposableHighlight);
  context.subscriptions.push(disposableFixAll);
  context.subscriptions.push(diagnosticCollection);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
