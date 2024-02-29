import * as ts from 'typescript';
import * as vscode from 'vscode';
import { AsyncRefactorActionSet } from '.';
import {
  camelCase,
  constantCase,
  kebabCase,
  pascalCase,
  snakeCase,
} from '../change-case';
import { getFirstMatchingAncestor } from '../traverse';

const createCasedNode = (
  node: ts.Identifier | ts.StringLiteral,
  casingFunction: (input: string) => string,
): ts.Identifier | ts.StringLiteral => {
  if (ts.isIdentifier(node)) {
    return ts.factory.createIdentifier(casingFunction(node.getText()));
  }

  return ts.factory.createStringLiteral(casingFunction(node.getText()));
};

const createCasingConversionAction = async (
  title: string,
  originalNode: ts.Identifier | ts.StringLiteral,
  casingFunction: (input: string) => string,
  source: ts.SourceFile,
  document: vscode.TextDocument,
): Promise<vscode.CodeAction> => {
  const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);

  if (ts.isStringLiteral(originalNode)) {
    const replacementNode = createCasedNode(originalNode, casingFunction);
    const replacementRange = new vscode.Range(
      document.positionAt(originalNode.getStart()),
      document.positionAt(originalNode.getEnd()),
    );

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const printedCallExpression = printer.printNode(
      ts.EmitHint.Unspecified,
      replacementNode,
      source,
    );

    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, replacementRange, printedCallExpression);

    return action;
  }

  action.edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider',
    document.uri,
    document.positionAt(originalNode.getStart()),
    casingFunction(originalNode.getText()),
  );

  return action;
};

export const convertLiteralCasing: AsyncRefactorActionSet = async (
  node,
  source,
  document,
) => {
  const identifier = getFirstMatchingAncestor(node, ts.isIdentifier);
  const stringLiteral = getFirstMatchingAncestor(node, ts.isStringLiteral);
  const knownNode = identifier ?? stringLiteral;

  if (knownNode === undefined) return [];

  const camelCaseAction = createCasingConversionAction(
    'Convert to camelCase',
    knownNode,
    camelCase,
    source,
    document,
  );

  const snakeCaseAction = createCasingConversionAction(
    'Convert to snake_case',
    knownNode,
    snakeCase,
    source,
    document,
  );

  const pascalCaseAction = createCasingConversionAction(
    'Convert to PascalCase',
    knownNode,
    pascalCase,
    source,
    document,
  );

  const constantCaseAction = createCasingConversionAction(
    'Convert to CONSTANT_CASE',
    knownNode,
    constantCase,
    source,
    document,
  );

  const kebabCaseAction = createCasingConversionAction(
    'Convert to kebab-case',
    knownNode,
    kebabCase,
    source,
    document,
  );

  return Promise.all([
    camelCaseAction,
    snakeCaseAction,
    pascalCaseAction,
    constantCaseAction,
    kebabCaseAction,
  ]);
};
