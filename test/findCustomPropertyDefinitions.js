const expect = require('unexpected').clone().use(require('unexpected-set'));
const findCustomPropertyDefinitions = require('../lib/findCustomPropertyDefinitions');
const AssetGraph = require('assetgraph');

describe('findCustomPropertyDefinitions', function () {
  it('should find a single property', function () {
    const assetGraph = new AssetGraph();
    const cssAsset = assetGraph.addAsset({
      type: 'Css',
      text: `
        :root {
          --foo: abc;
        }
      `,
    });
    expect(findCustomPropertyDefinitions([cssAsset]), 'to satisfy', {
      '--foo': [{ value: 'abc' }],
    });
  });

  it('should find multiple definitions of the same custom property', function () {
    const assetGraph = new AssetGraph();
    const cssAsset = assetGraph.addAsset({
      type: 'Css',
      text: `
        :root {
          --foo: abc;
        }

        html {
          --foo: def;
        }
      `,
    });
    expect(findCustomPropertyDefinitions([cssAsset]), 'to satisfy', {
      '--foo': [{ value: 'abc' }, { value: 'def' }],
    });
  });

  it('should include the definitions of custom properties that contribute', function () {
    const assetGraph = new AssetGraph();
    const cssAsset = assetGraph.addAsset({
      type: 'Css',
      text: `
        :root {
          --quux: def;
          --bar: var(--quux);
        }

        html {
          --foo: var(--bar);
        }
      `,
    });
    expect(findCustomPropertyDefinitions([cssAsset]), 'to satisfy', {
      '--foo': [
        { prop: '--foo', value: 'var(--bar)' },
        { prop: '--bar', value: 'var(--quux)' },
      ],
      '--bar': [
        { prop: '--bar', value: 'var(--quux)' },
        { prop: '--quux', value: 'def' },
      ],
      '--quux': [{ prop: '--quux', value: 'def' }],
    });
  });

  it('should ignore custom property look-alikes inside strings', function () {
    const assetGraph = new AssetGraph();
    const cssAsset = assetGraph.addAsset({
      type: 'Css',
      text: `
        :root {
          --quux: def;
          --bar: 'var(--quux)';
        }

        html {
          --foo: var(--bar);
        }
      `,
    });
    expect(findCustomPropertyDefinitions([cssAsset]), 'to satisfy', {
      '--foo': [
        { prop: '--foo', value: 'var(--bar)' },
        { prop: '--bar', value: "'var(--quux)'" },
      ],
      '--bar': [{ prop: '--bar', value: "'var(--quux)'" }],
      '--quux': [{ prop: '--quux', value: 'def' }],
    });
  });

  it('should not break when there is a cyclic definition', function () {
    const assetGraph = new AssetGraph();
    const cssAsset = assetGraph.addAsset({
      type: 'Css',
      text: `
        :root {
          --foo: var(--bar);
        }

        html {
          --bar: var(--foo);
        }
      `,
    });
    expect(findCustomPropertyDefinitions([cssAsset]), 'to satisfy', {
      '--foo': [
        { prop: '--foo', value: 'var(--bar)' },
        { prop: '--bar', value: 'var(--foo)' },
      ],
    });
  });

  it('should not break when an undefined custom property is referenced', function () {
    const assetGraph = new AssetGraph();
    const cssAsset = assetGraph.addAsset({
      type: 'Css',
      text: `
        :root {
          --foo: var(--bar);
        }
      `,
    });
    expect(findCustomPropertyDefinitions([cssAsset]), 'to satisfy', {
      '--foo': [{ prop: '--foo', value: 'var(--bar)' }],
    });
  });
});
