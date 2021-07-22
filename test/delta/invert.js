var Delta = require('../../dist/Delta');

describe('invert()', function () {
  it('insert', function () {
    var delta = new Delta().retain(2).insert('A');
    var base = new Delta().insert('123456');
    var expected = new Delta().retain(2).delete(1);
    var inverted = delta.invert(base);
    expect(expected).toEqual(inverted);
    expect(base.compose(delta).compose(inverted)).toEqual(base);
  });

  it('delete', function () {
    var delta = new Delta().retain(2).delete(3);
    var base = new Delta().insert('123456');
    var expected = new Delta().retain(2).insert('345');
    var inverted = delta.invert(base);
    expect(expected).toEqual(inverted);
    expect(base.compose(delta).compose(inverted)).toEqual(base);
  });

  it('retain', function () {
    var delta = new Delta().retain(2).retain(3, { bold: true });
    var base = new Delta().insert('123456');
    var expected = new Delta().retain(2).retain(3, { bold: null });
    var inverted = delta.invert(base);
    expect(expected).toEqual(inverted);
    expect(base.compose(delta).compose(inverted)).toEqual(base);
  });

  it('retain on a delta with different attributes', function () {
    var base = new Delta().insert('123').insert('4', { bold: true });
    var delta = new Delta().retain(4, { italic: true });
    var expected = new Delta().retain(4, { italic: null });
    var inverted = delta.invert(base);
    expect(expected).toEqual(inverted);
    expect(base.compose(delta).compose(inverted)).toEqual(base);
  });

  it('combined', function () {
    var delta = new Delta()
      .retain(2)
      .delete(2)
      .insert('AB', { italic: true })
      .retain(2, { italic: null, bold: true })
      .retain(2, { color: 'red' })
      .delete(1);
    var base = new Delta()
      .insert('123', { bold: true })
      .insert('456', { italic: true })
      .insert('789', { color: 'red', bold: true });
    var expected = new Delta()
      .retain(2)
      .insert('3', { bold: true })
      .insert('4', { italic: true })
      .delete(2)
      .retain(2, { italic: true, bold: null })
      .retain(2)
      .insert('9', { color: 'red', bold: true });
    var inverted = delta.invert(base);
    expect(expected).toEqual(inverted);
    expect(base.compose(delta).compose(inverted)).toEqual(base);
  });

  describe('custom embed handler', () => {
    beforeEach(() => {
      Delta.registerEmbed('delta', {
        compose: (a, b) => new Delta(a).compose(new Delta(b)).ops,
        invert: (a, b) => new Delta(a).invert(new Delta(b)).ops,
      });
    });

    afterEach(() => {
      Delta.unregisterEmbed('delta');
    });

    it('invert a normal change', () => {
      var delta = new Delta().retain(1, { bold: true });
      var base = new Delta().insert({ delta: [{ insert: 'a' }] });

      var expected = new Delta().retain(1, { bold: null });
      var inverted = delta.invert(base);
      expect(expected).toEqual(inverted);
      expect(base.compose(delta).compose(inverted)).toEqual(base);
    });

    it('invert an embed change', () => {
      var delta = new Delta().retain({ delta: [{ insert: 'b' }] });
      var base = new Delta().insert({ delta: [{ insert: 'a' }] });

      var expected = new Delta().retain({
        delta: [{ delete: 1 }],
      });
      var inverted = delta.invert(base);
      expect(expected).toEqual(inverted);
      expect(base.compose(delta).compose(inverted)).toEqual(base);
    });

    it('invert an embed change with numbers', () => {
      var delta = new Delta()
        .retain(1)
        .retain(1, { bold: true })
        .retain({ delta: [{ insert: 'b' }] });
      var base = new Delta()
        .insert('\n\n')
        .insert({ delta: [{ insert: 'a' }] });

      var expected = new Delta()
        .retain(1)
        .retain(1, { bold: null })
        .retain({
          delta: [{ delete: 1 }],
        });
      var inverted = delta.invert(base);
      expect(expected).toEqual(inverted);
      expect(base.compose(delta).compose(inverted)).toEqual(base);
    });

    it('respects base attributes', () => {
      var delta = new Delta()
        .delete(1)
        .retain(1, { header: 2 })
        .retain({ delta: [{ insert: 'b' }] }, { padding: 10, margin: 0 });
      var base = new Delta()
        .insert('\n')
        .insert('\n', { header: 1 })
        .insert({ delta: [{ insert: 'a' }] }, { margin: 10 });

      var expected = new Delta()
        .insert('\n')
        .retain(1, { header: 1 })
        .retain(
          {
            delta: [{ delete: 1 }],
          },
          { padding: null, margin: 10 },
        );
      var inverted = delta.invert(base);
      expect(expected).toEqual(inverted);
      expect(base.compose(delta).compose(inverted)).toEqual(base);
    });

    it('works with multiple embeds', () => {
      var delta = new Delta()
        .retain(1)
        .retain({ delta: [{ delete: 1 }] })
        .retain({ delta: [{ delete: 1 }] });

      var base = new Delta()
        .insert('\n')
        .insert({ delta: [{ insert: 'a' }] })
        .insert({ delta: [{ insert: 'b' }] });

      var expected = new Delta()
        .retain(1)
        .retain({ delta: [{ insert: 'a' }] })
        .retain({ delta: [{ insert: 'b' }] });

      var inverted = delta.invert(base);
      expect(expected).toEqual(inverted);
      expect(base.compose(delta).compose(inverted)).toEqual(base);
    });
  });
});
