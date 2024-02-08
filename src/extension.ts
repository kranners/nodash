import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from './actions';
import { getDescendantAtPosition } from './traverse';
import { convertTernary } from './actions/convert-ternary';
import { splitCallExpression } from './actions/split-call-expression';
import { invertAndSimplifyIfElse } from './actions/simplify-if-else';

export const AVAILABLE_ACTIONS: RefactorAction[] = [
  convertTernary,
  splitCallExpression,
  invertAndSimplifyIfElse,
];

const CODE_ACTION_KINDS = [
  vscode.CodeActionKind.QuickFix,
  vscode.CodeActionKind.RefactorMove,
  vscode.CodeActionKind.Refactor,
];

const SUPPORTED_LANGUAGES = [
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
];

class RefactorProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
  ): vscode.CodeAction[] {
    const source = ts.createSourceFile(
      document.fileName,
      document.getText(),
      ts.ScriptTarget.Latest,
      true,
    );

    const node = getDescendantAtPosition(source, range.start);

    const actions = AVAILABLE_ACTIONS.map((action) =>
      action(node, source, document),
    );

    return actions.filter(
      (action): action is vscode.CodeAction => action !== undefined,
    );
  }
}

export const channel = vscode.window.createOutputChannel('Refacta', {
  log: true,
});

export function activate(context: vscode.ExtensionContext) {
  channel.appendLine('Extension activated 🎉');

  const providers = SUPPORTED_LANGUAGES.map((language) => {
    return vscode.languages.registerCodeActionsProvider(
      language,
      new RefactorProvider(),
      {
        providedCodeActionKinds: CODE_ACTION_KINDS,
      },
    );
  });

  context.subscriptions.push(...providers);
}
