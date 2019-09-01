import { expect } from '@open-wc/testing';

import { square } from '../src/helpers.js';

describe('square', () => {
  it('calculates square of 2 to be 4', () => {
    expect(square(2)).to.equal(4);
    expect(square('two')).to.equal(4);
  });

  it('supports an offset', () => {
    expect(square(2, 10)).to.equal(14);
    expect(square(2, 'ten')).to.equal(14);
  });
});
