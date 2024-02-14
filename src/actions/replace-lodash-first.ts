import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import {
  getFirstMatchingAncestor,
  isPotentialLodashExpression,
} from '../traverse';

const getCallIdentifier = (
  callExpression: ts.CallExpression,
): ts.MemberName | ts.LeftHandSideExpression => {
  if (ts.isPropertyAccessExpression(callExpression.expression)) {
    return callExpression.expression.name;
  }
  return callExpression.expression;
};

export const replaceLodashFirst: RefactorAction = (node, source, document) => {
  const callExpression = getFirstMatchingAncestor(node, ts.isCallExpression);

  if (callExpression === undefined) return;
  if (callExpression.arguments.length !== 1) return;
  if (!isPotentialLodashExpression(callExpression.expression)) return;

  const [arrayIdentifier] = callExpression.arguments;

  const callIdentifier = getCallIdentifier(callExpression);
  if (callIdentifier.getText() !== 'first') return;

  const replacementAccessExpression = ts.factory.createElementAccessExpression(
    arrayIdentifier,
    ts.factory.createNumericLiteral('0'),
  );

  const replacementRange = new vscode.Range(
    document.positionAt(callExpression.getStart()),
    document.positionAt(callExpression.getEnd()),
  );

  const action = new vscode.CodeAction(
    'Replace potentially unnecessary first()',
    vscode.CodeActionKind.QuickFix,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedCallExpression = printer.printNode(
    ts.EmitHint.Unspecified,
    replacementAccessExpression,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();

  action.edit.replace(document.uri, replacementRange, printedCallExpression);

  return action;
};
