import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction, RefactorActionSet } from './actions';
import { getDescendantAtPosition } from './traverse';
import { convertTernary } from './actions/convert-ternary';
import { splitCallExpression } from './actions/split-call-expression';
import { invertAndSimplifyIfElse } from './actions/invert-simplify-if-else';
import { simplifyIfElse } from './actions/simplify-if-else';
import { replaceMappingFunction } from './actions/replace-mapping-function';
import { replaceLodashFirst } from './actions/replace-lodash-first';
import { replaceLodashGet } from './actions/replace-lodash-get';
import { caseSwitchToIf } from './actions/case-switch-to-if';
import { replaceIdentifierCasing } from './actions/replace-identifier-casing';

const AVAILABLE_ACTIONS: RefactorAction[] = [
  convertTernary,
  splitCallExpression,
  simplifyIfElse,
  invertAndSimplifyIfElse,
  replaceMappingFunction,
  replaceLodashFirst,
  replaceLodashGet,
  caseSwitchToIf,
];

const AVAILABLE_ACTION_SETS: RefactorActionSet[] = [replaceIdentifierCasing];

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

export const channel = vscode.window.createOutputChannel('Nodash', {
  log: true,
});

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
    ).filter((action): action is vscode.CodeAction => action !== undefined);

    const actionsFromSets = AVAILABLE_ACTION_SETS.map((actionSet) =>
      actionSet(node, source, document),
    ).flat();

    return [...actions, ...actionsFromSets];
  }
}

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
