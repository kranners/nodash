import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorActionSet } from '.';
import { getFirstMatchingAncestor } from '../traverse';

const createReplacementAction = (
  title: string,
  replacementRange: vscode.Range,
  replacementNode: ts.Node,
  source: ts.SourceFile,
  document: vscode.TextDocument,
): vscode.CodeAction => {
  const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedCallExpression = printer.printNode(
    ts.EmitHint.Unspecified,
    replacementNode,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();
  action.edit.replace(document.uri, replacementRange, printedCallExpression);

  return action;
};

export const replaceIdentifierCasing: RefactorActionSet = (
  node,
  source,
  document,
) => {
  const identifier = getFirstMatchingAncestor(node, ts.isIdentifier);

  if (identifier === undefined) return [];

  const replacementRange = new vscode.Range(
    document.positionAt(identifier.getStart()),
    document.positionAt(identifier.getEnd()),
  );

  const replacementIdentifier = ts.factory.createIdentifier(
    identifier.text.split('').reverse().join(''),
  );

  const reverseAction = createReplacementAction(
    'Reverse identifier',
    replacementRange,
    replacementIdentifier,
    source,
    document,
  );

  const anotherReverseAction = createReplacementAction(
    'Reverse identifier, but again',
    replacementRange,
    replacementIdentifier,
    source,
    document,
  );

  return [reverseAction, anotherReverseAction];
};
