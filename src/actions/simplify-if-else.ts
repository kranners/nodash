import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import { getFirstMatchingAncestor } from '../traverse';

export const simplifyIfElse: RefactorAction = (node, source, document) => {
  const ifStatement = getFirstMatchingAncestor(node, ts.isIfStatement);

  if (ifStatement === undefined) return;
  if (ifStatement.elseStatement === undefined) return;

  if (!ts.isBlock(ifStatement.thenStatement)) return;
  if (!ts.isBlock(ifStatement.elseStatement)) return;

  const replacementIfStatement = ts.factory.createIfStatement(
    ifStatement.expression,
    ifStatement.thenStatement,
  );

  const ifStatementRange = new vscode.Range(
    document.positionAt(ifStatement.getStart(source)),
    document.positionAt(ifStatement.end),
  );

  const action = new vscode.CodeAction(
    'Simplify if/else statement',
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
    ifStatement.elseStatement.statements,
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
