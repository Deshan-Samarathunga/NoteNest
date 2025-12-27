module.exports = function ({ types: t }) {
  return {
    name: 'transform-import-meta-stub',
    visitor: {
      MetaProperty(path) {
        if (
          path.get('meta').isIdentifier({ name: 'import' }) &&
          path.get('property').isIdentifier({ name: 'meta' })
        ) {
          // Replace import.meta with an object that preserves a usable url when possible.
          const urlExpr = t.conditionalExpression(
            t.binaryExpression(
              '!==',
              t.unaryExpression('typeof', t.identifier('location'), true),
              t.stringLiteral('undefined')
            ),
            t.memberExpression(t.identifier('location'), t.identifier('href')),
            t.stringLiteral('')
          );

          path.replaceWith(
            t.objectExpression([t.objectProperty(t.identifier('url'), urlExpr)])
          );
        }
      },
    },
  };
};
