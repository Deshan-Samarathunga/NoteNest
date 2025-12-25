module.exports = function ({ types: t }) {
  return {
    name: 'transform-import-meta-stub',
    visitor: {
      MetaProperty(path) {
        if (
          path.get('meta').isIdentifier({ name: 'import' }) &&
          path.get('property').isIdentifier({ name: 'meta' })
        ) {
          // Replace import.meta with a harmless object; include url for libraries that expect it.
          path.replaceWith(
            t.objectExpression([
              t.objectProperty(t.identifier('url'), t.stringLiteral('')),
            ])
          );
        }
      },
    },
  };
};
