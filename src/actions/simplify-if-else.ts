import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import { getFirstMatchingAncestor } from '../traverse';
import { channel } from '../extension';

const invertExpression = (expression: ts.Expression): ts.Expression => {
  if (ts.isPrefixUnaryExpression(expression)) {
    return expression.operand;
  }

  return ts.factory.createPrefixUnaryExpression(
    ts.SyntaxKind.ExclamationToken,
    expression,
  );
};

export const invertAndSimplifyIfElse: RefactorAction = (
  node,
  source,
  document,
) => {
  channel.appendLine('Simplify if else action...');

  const ifStatement = getFirstMatchingAncestor(node, ts.isIfStatement);

  if (ifStatement === undefined) return;
  if (ifStatement.elseStatement === undefined) return;

  if (!ts.isBlock(ifStatement.thenStatement)) return;
  if (!ts.isBlock(ifStatement.elseStatement)) return;

  channel.appendLine('Found matching if and else statements');

  const replacementIfStatement = ts.factory.createIfStatement(
    invertExpression(ifStatement.expression),
    ifStatement.elseStatement,
  );

  const ifStatementRange = new vscode.Range(
    document.positionAt(ifStatement.pos),
    document.positionAt(ifStatement.end),
  );

  const action = new vscode.CodeAction(
    'Invert and simplify if/else statement',
    vscode.CodeActionKind.QuickFix,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedIfStatement = printer.printNode(
    ts.EmitHint.Unspecified,
    replacementIfStatement,
    source,
  );

  const printedRemainingStatements = printer.printList(
    ts.ListFormat.MultiLine,
    ifStatement.thenStatement.statements,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();

  action.edit.replace(document.uri, ifStatementRange, printedIfStatement);
  action.edit.insert(
    document.uri,
    ifStatementRange.end,
    printedRemainingStatements,
  );

  return action;
};
