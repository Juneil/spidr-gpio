'use strict';

var fs = require('fs');
const path = require('path');
const Epoll = require('epoll').Epoll;
const debug = require('debug')('pin');

module.exports = class Pin {

  constructor(id, direction, edge) {
    if (!id) throw new Error('Empty gpio id');
    if (!(!isNaN(id) && (id % 1 === 0))) throw new Error('Gpio id must be an integer');
    if (id < Pin.BOUND[0] || id > Pin.BOUND[1])
      throw new Error(`Out of range (${Pin.BOUND[0]}-${Pin.BOUND[1]}): ${id}`);
    this._edges = [Pin.EDGE_NONE, Pin.EDGE_RISING, Pin.EDGE_FALLING, Pin.EDGE_BOTH];
    this._directions = [Pin.DIR_IN, Pin.DIR_OUT];
    this._id = id;
    this.setup(direction, edge);
  }

  /**
   * CONSTANTS
   */
  static get PATH()         { return '/sys/class/gpio'; }
  static get DIR_IN()       { return 'in'; }
  static get DIR_OUT()      { return 'out'; }
  static get VALUE_UP()     { return '1'; }
  static get VALUE_DOWN()   { return '0'; }
  static get EDGE_NONE()    { return 'none'; }
  static get EDGE_RISING()  { return 'rising'; }
  static get EDGE_FALLING() { return 'falling'; }
  static get EDGE_BOTH()    { return 'both'; }
  static get BOUND()        { return [2, 27]; }


  /**
   * edge - Set the edge, for interrupts while reading
   *
   * @param  {string} value   none/rising/falling/both
   * @return {Pin}
   */
  edge(value) {
    debug('Edge', this._id, value);
    if (!this.isExported()) return this;
    if (this._edges.indexOf(value) < 0) throw new Error('Wrong edge');
    fs.writeFileSync(path.resolve(Pin.PATH, 'gpio' + this._id, 'edge'), value);
    debug('Edge', this._id, value, 'OK');
    return this;
  }

  /**
   * direction - Set the direction
   *
   * @param  {string} value   in/out
   * @return {Pin}
   */
  direction(value) {
    debug('Direction', this._id, value);
    if (!this.isExported()) return this;
    if (this._directions.indexOf(value) < 0) throw new Error('Wrong direction');
    fs.writeFileSync(path.resolve(Pin.PATH, 'gpio' + this._id, 'direction'), value);
    debug('Direction', this._id, value, 'OK');
    return this;
  }


  /**
   * read - Read value from a pin
   *
   * @return {boolean}  true/false - if null then no read
   */
  read() {
    debug('Read', this._id);
    if (!this.isExported()) return;
    let val = fs.readFileSync(path.resolve(Pin.PATH, 'gpio' + this._id, 'value'), 'utf-8');
    debug('Read', this._id, 'OK');
    return ((val + '').trim() || '0') === '1';
  }

  /**
   * write - Write output of a pin
   *
   * @param  {*} value  0/1
   * @return {Pin}
   */
  write(value) {
    debug('Write', this._id, value);
    if (!this.isExported()) return this;
    let val = (value === Pin.VALUE_UP ||
        value === true || value === 1) ? Pin.VALUE_UP : Pin.VALUE_DOWN;
    fs.writeFileSync(path.resolve(Pin.PATH, 'gpio' + this._id, 'value'), val);
    debug('Write', this._id, value, 'OK');
    return this;
  }

  /**
   * isExported - Check if the pin is exported
   *
   * @return {boolean}  true/false
   */
  isExported() {
    debug('isExported', this._id);
    try {
      return !!fs.statSync(path.resolve(Pin.PATH, 'gpio' + this._id));
    }
    catch (e) { debug(e); }
    return false;
  }

  /**
   * exportMe - Export id to link with the pin
   *
   * @return {Pin}
   */
  exportMe() {
    debug('Export', this._id);
    fs.writeFileSync(path.resolve(Pin.PATH, 'export'), this._id);
    return this;
  }

  /**
   * Unexport - Unexport id to unlink with the pin
   *
   * @return {Pin}
   */
  unexport() {
    debug('Unexport', this._id);
    fs.writeFileSync(path.resolve(Pin.PATH, 'unexport'), this._id);
    return this;
  }

  /**
   * setup - Setup the pin with direction and edge
   *
   * @param  {string} direction   in/out
   * @param  {string} edge        none/rising/falling/both
   * @return {Pin}
   */
  setup(direction, edge) {
    direction = direction || Pin.DIR_OUT;
    edge = edge || Pin.EDGE_NONE;
    if(!this.isExported()) {
      this.exportMe();
    }
    this.direction(direction)
        .edge(edge);
    return this;
  }

  /**
   * listen - Subscribe callback to listen changes
   *
   * @param  {function} callback  subscriber
   * @return {Pin}
   */
  listen(callback) {
    if (!callback || !(callback instanceof Function)) return this;
    this.setup(Pin.DIR_IN, Pin.EDGE_BOTH);
    this._listener = callback;
    const clear = fd => fs.readSync(fd, new Buffer(1), 0, 1, 0);
    const poller = new Epoll((err, fd) => {
      if (err) throw err;
      this._listener(this.read());
      clear(fd);
    });
    const fd = fs.openSync(path.resolve(Pin.PATH, 'gpio' + this._id, 'value'), 'r+');
    clear(fd);
    poller.add(fd, Epoll.EPOLLPRI);
    return this;
  }

  up() {
    if (!this.isExported()) return this;
    this.write(Pin.VALUE_UP);
    return this;
  }

  down() {
    if (!this.isExported()) return this;
    this.write(Pin.VALUE_DOWN);
    return this;
  }
};
