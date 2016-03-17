'use strict';

const fs = require('fs');
const path = require('path');
const Epoll = require('epoll').Epoll;
const debug = require('debug')('pin');

const GPIO = {
  PATH:     '/sys/class/gpio',
  IN:       'in',
  OUT:      'out',
  UP:       '1',
  DOWN:     '0',
  NONE:     'none',
  RISING:   'rising',
  FALLING:  'falling',
  BOTH:     'both',
  BOUND:    [2, 27]
};

function Pin(id) {
  if (!id) throw new Error('Empty gpio id');
  if (!(!isNaN(id) && (id % 1 === 0))) throw new Error('id must be an integer');
  if (id < GPIO.BOUND[0] || id > GPIO.BOUND[1])
    throw new Error(`Out of range (${GPIO.BOUND[0]}-${GPIO.BOUND[1]}): ${id}`);
  this._id = id;
}

module.exports = Pin;


Pin.prototype.up = function () {
  if (!this.isExported()) {
    this.setup(GPIO.OUT);
  }
  this.write(GPIO.UP);
};

Pin.prototype.down = function () {
  if (!this.isExported()) {
    this.setup(GPIO.OUT);
  }
  this.write(GPIO.DOWN);
};

Pin.prototype.listen = function (callback, edge) {
  if (!callback || !(callback instanceof Function))
    return;
  edge = edge || GPIO.BOTH
  this.setup(GPIO.IN, edge);
  this._listener = callback;
  let clear = (fd) => {
    fs.readSync(fd, new Buffer(1), 0, 1, 0);
  };
  let poller = new Epoll((err, fd) => {
    if (err) throw err;
    this._listener(this.read());
    clear(fd);
  });
  let fd = fs.openSync(path.resolve(GPIO.PATH, 'gpio' + this._id, 'value'), 'r+');
  clear(fd);
  poller.add(fd, Epoll.EPOLLPRI);
};

/**
 * setup function - setup the pin
 *
 * @param  {string} direction
 * @param  {string} edge
 * @return {null}
 */
Pin.prototype.setup = function (direction, edge) {
  if(!this.isExported()) {
    this.export();
  }
  direction = direction || GPIO.IN;
  this.direction(direction);
  edge = edge || GPIO.NONE;
  this.edge(edge);
  return this;
};

/**
 * export function - export the id to GPIO
 *
 * @return {null}
 */
Pin.prototype.export = function() {
  debug('Export', this._id);
  fs.writeFileSync(path.resolve(GPIO.PATH, 'export'), this._id);
  return this;
};


/**
 * unexport - unexport the id from GPIO
 *
 * @return {null}
 */
Pin.prototype.unexport = function unexport() {
  debug('Unexport', this._id);
  fs.writeFileSync(path.resolve(GPIO.PATH, 'unexport'), this._id);
  return this;
};


/**
 * isExported - Check if id is already exported
 *
 * @return {boolean}
 */
Pin.prototype.isExported = function isExported() {
  debug('isExported', this._id);
  let val = false;
  try {
    val = !!fs.statSync(path.resolve(GPIO.PATH, 'gpio' + this._id));
  }
  catch (e) { debug(e); }
  return val;
};


/**
 * write - write a value into GPIO
 *
 * @param  {*}    bit   to write 0/1
 * @return {null}
 */
Pin.prototype.write = function write(bit) {
  debug('Write', this._id, bit);
  if (!this.isExported()) {
    debug('!! Pin ' + this._id + ' is not exported');
    return this;
  }
  let val = GPIO.DOWN;
  if (bit === GPIO.UP || bit === true || bit === 1)
    val = GPIO.UP;
  fs.writeFileSync(path.resolve(GPIO.PATH, 'gpio' + this._id, 'value'), val);
  return this;
};


/**
 * read - read value for a pin
 *
 * @return {boolean}
 */
Pin.prototype.read = function read() {
  debug('Read', this._id);
  if (!this.isExported()) {
    debug('!! Pin ' + this._id + ' is not exported');
    return;
  }
  let val = fs.readFileSync(path.resolve(GPIO.PATH, 'gpio' + this._id, 'value'), 'utf-8');
  val = (val + '').trim() || '0';
  return (val === '1');
};

/**
 * direction - set direction for the gpio id
 *
 * @param  {string}   direction   in/out
 * @param  {null}
 */
Pin.prototype.direction = function direction(direction) {
  debug('Direction', this._id, direction);
  if (!this.isExported()) {
    debug('!! Pin ' + this._id + ' is not exported');
    return this;
  }
  if (direction !== GPIO.IN && direction !== GPIO.OUT) {
    debug(`Wrong direction (${GPIO.IN}/${GPIO.OUT}): ${direction}`);
    return this;
  }
  fs.writeFileSync(path.resolve(GPIO.PATH, 'gpio' + this._id, 'direction'), direction);
  return this;
};


/**
 * edge - set edge option for the gpio id
 *
 * @param  {string}   edge  none/rising/falling/both
 * @param  {null}
 */
Pin.prototype.edge = function edge(edge) {
  debug('Edge', this._id, edge);
  if (!this.isExported()) {
    debug('!! Pin ' + this._id + ' is not exported');
    return this;
  }
  if (edge !== GPIO.NONE && edge !== GPIO.RISING && edge !== GPIO.FALLING && edge !== GPIO.BOTH) {
    debug(`Wrong edge (${GPIO.NONE}/${GPIO.RISING}/${GPIO.FALLING}/${GPIO.BOTH}): ${edge}`);
    return this;
  }
  fs.writeFileSync(path.resolve(GPIO.PATH, 'gpio' + this._id, 'edge'), edge);
  return this;
};
