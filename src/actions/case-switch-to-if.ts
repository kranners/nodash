import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import { getFirstMatchingAncestor } from '../traverse';

const createStrictEquality = (
  matchExpression: ts.Expression,
  clauseExpression: ts.Expression,
): ts.BinaryExpression => {
  const strictEqualityToken = ts.factory.createToken(
    ts.SyntaxKind.EqualsEqualsEqualsToken,
  );

  return ts.factory.createBinaryExpression(
    matchExpression,
    strictEqualityToken,
    clauseExpression,
  );
};

const createLogicalOr = (
  left: ts.Expression,
  right: ts.Expression,
): ts.BinaryExpression => {
  const barBarToken = ts.factory.createToken(ts.SyntaxKind.BarBarToken);

  return ts.factory.createBinaryExpression(left, barBarToken, right);
};

const clauseExpressionsToBinaryExpression = (
  matchExpression: ts.Expression,
  clauseExpressions: ts.Expression[],
  existingExpression?: ts.BinaryExpression | undefined,
): ts.BinaryExpression => {
  const [first, ...remaining] = clauseExpressions;

  const equalityExpression = createStrictEquality(matchExpression, first);

  if (remaining.length === 0) {
    if (existingExpression) {
      return createLogicalOr(existingExpression, equalityExpression);
    }

    return equalityExpression;
  }

  if (existingExpression) {
    return clauseExpressionsToBinaryExpression(
      matchExpression,
      remaining,
      createLogicalOr(existingExpression, equalityExpression),
    );
  }

  return clauseExpressionsToBinaryExpression(
    matchExpression,
    remaining,
    equalityExpression,
  );
};

const caseClausesToIfStatements = (
  clauses: ts.CaseClause[],
  matchExpression: ts.Expression,
): ts.IfStatement[] => {
  let emptyClauses: ts.CaseClause[] = [];
  const ifStatements: ts.IfStatement[] = [];

  for (const clause of clauses) {
    if (clause.statements.length === 0) {
      emptyClauses.push(clause);
      continue;
    }

    const emptyExpressions = emptyClauses.map(({ expression }) => expression);
    const expressions = [clause.expression, ...emptyExpressions];

    const binaryExpression = clauseExpressionsToBinaryExpression(
      matchExpression,
      expressions,
    );

    // Break statements are invalid outside of a case switch.
    // However, their logical equivalent here would just be an empty return.
    const breakToReturnStatements = clause.statements.map((statement) => {
      if (ts.isBreakStatement(statement)) {
        return ts.factory.createReturnStatement();
      }

      return statement;
    });

    const ifStatement = ts.factory.createIfStatement(
      binaryExpression,
      ts.factory.createBlock(breakToReturnStatements),
    );

    ifStatements.push(ifStatement);

    // Our empty clauses have fallen through to this statement and aren't needed anymore
    emptyClauses = [];
  }

  return ifStatements;
};

export const caseSwitchToIf: RefactorAction = (node, source, document) => {
  const switchStatement = getFirstMatchingAncestor(node, ts.isSwitchStatement);

  if (switchStatement === undefined) return;

  const matchExpression = switchStatement.expression;
  const caseClauses = switchStatement.caseBlock.clauses.filter(ts.isCaseClause);
  const defaultClause = switchStatement.caseBlock.clauses.find(
    ts.isDefaultClause,
  );

  const ifStatements = caseClausesToIfStatements(caseClauses, matchExpression);
  const defaultStatements = defaultClause?.statements ?? [];

  const replacementRange = new vscode.Range(
    document.positionAt(switchStatement.getStart()),
    document.positionAt(switchStatement.getEnd()),
  );

  const action = new vscode.CodeAction(
    'Replace switch statement with if',
    vscode.CodeActionKind.Refactor,
  );

  const replacementArray = ts.factory.createNodeArray([
    ...ifStatements,
    ...defaultStatements,
  ]);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedReplacementStatements = printer.printList(
    ts.ListFormat.MultiLine,
    replacementArray,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();

  action.edit.replace(
    document.uri,
    replacementRange,
    printedReplacementStatements,
  );

  return action;
};
