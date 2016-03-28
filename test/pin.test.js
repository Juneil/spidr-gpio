'use strict';

const assert = require('chai').assert;
const rewire = require('rewire');
const Pin = rewire('../lib/pin');
var myFS = {};
Pin.__set__('fs', {
  writeFileSync: (path, value) => {
    if(path.indexOf('export') > -1) {
      myFS[Pin.PATH() + '/gpio' + value] = 'folder';
    }
    if(path.indexOf('unexport') > -1) {
      Object.keys(myFS).forEach(elem => {
        if(elem.indexOf(Pin.PATH() + '/gpio' + value) > -1) {
          delete myFS[elem];
        }
      });
    }
    myFS[path] = value;
  },
  readFileSync: (path) => {
    if (myFS[path]) return myFS[path];
    else throw new Error('File not found');
  },
  statSync: (path) => {
    let check = Object.keys(myFS).some(elem => (elem.indexOf(path) > -1));
    if (check) return {};
    else throw new Error('File not found');
  }
});

describe('Creation', () => {
  it('Success', () => {
    const pin = new Pin(4);
    assert.isDefined(pin);
  });
  it('Failed - empty', () => {
    try { new Pin(); }
    catch (e) { assert.equal(e.message, 'Empty gpio id'); }
  });
  it('Failed - integer', () => {
    try { new Pin(1.4); }
    catch (e) { assert.equal(e.message, 'Gpio id must be an integer'); }
  });
  it('Failed - bound', () => {
    try { new Pin(1); }
    catch (e) { assert.equal(e.message, 'Out of range (2-27): 1'); }
  });
});

describe('Direction', () => {
  it('Success', () => {
    const pin = new Pin(6);
    pin.direction(Pin.DIR_IN());
    assert.equal(myFS[Pin.PATH() + '/gpio6/direction'], Pin.DIR_IN());
  });
  it('Failed', () => {
    const pin = new Pin(6);
    try {
      pin.direction('toto');
    } catch (e) {
      assert.equal(e.message, 'Wrong direction');
    }
  });
});

describe('Edge', () => {
  it('Success', () => {
    const pin = new Pin(7);
    pin.edge(Pin.EDGE_RISING());
    assert.equal(myFS[Pin.PATH() + '/gpio7/edge'], Pin.EDGE_RISING());
  });
  it('Failed', () => {
    const pin = new Pin(7);
    try {
      pin.edge('toto');
    } catch (e) {
      assert.equal(e.message, 'Wrong edge');
    }
  });
});

const pin8 = new Pin(8);
describe('Export / Unexport / isExported', () => {
  it('First', () => {
    assert.equal(pin8.isExported(), true);
  });
  it('Unexport', () => {
    pin8.unexport();
    assert.equal(pin8.isExported(), false);
  });
  it('Export', () => {
    pin8.exportMe();
    assert.equal(pin8.isExported(), true);
  });
});

const pin9 = new Pin(9);
describe('Write / Read', () => {
  it('Write', () => {
    pin9.write(1);
    assert.equal(myFS[Pin.PATH() + '/gpio9/value'], Pin.VALUE_UP());
  });
  it('Read', () => {
    assert.equal(pin9.read(), Pin.VALUE_UP());
  });
});

describe('Setup', () => {
  it('Success', () => {
    const pin = new Pin(10);
    pin.setup(Pin.DIR_IN(), Pin.EDGE_FALLING());
    assert.equal(myFS[Pin.PATH() + '/gpio10/direction'], Pin.DIR_IN());
    assert.equal(myFS[Pin.PATH() + '/gpio10/edge'], Pin.EDGE_FALLING());
  });
});
