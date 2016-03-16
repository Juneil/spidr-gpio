'use strict';

const fs = require('fs');
const path = require('path');
const GPIO_PATH = '/sys/class/gpio';
const IDS = [2, 27];
const IN = 'in';
const OUT = 'out';
const UP = '1';
const DOWN = '0';
const EDGE = {
  none: 'none',
  rising: 'rising',
  falling: 'falling',
  both: 'both'
};

var currentIds = {};

function GPIO () {
}

module.exports = new GPIO();

GPIO.prototype.setup = function(id, direction, edge, next) {
  this._exportId(id, (err) => {
    if (err) return next(err);
    this._edge(id, edge, (err) => {
      if (err) return next(err);
      this._direction(id, direction, next);
    });
  });
};

GPIO.prototype.up = function (id, next) {
  this._exported(id, (value) => {
    if (value) {
      if (currentIds[id] && currentIds[id].direction === OUT) {
        this._write(id, UP, next);
      }
      else {
        this._unexportId(id, (err) => {
          if (err) return next(err);
          this.setup(id, OUT, EDGE.none, (err) => {
            if (err) return next(err);
            this._write(id, UP, next);
          });
        });
      }
    }
    else {
      this.setup(id, OUT, EDGE.none, (err) => {
        if (err) return next(err);
        this._write(id, UP, next);
      });
    }
  });
};

GPIO.prototype._checkId = function checkId(id, next) {
  if (!id) return next(new Error('Empty gpio id'));
  if (!(!isNaN(id) && (id % 1 === 0))) return next(new Error('id must be an integer'));
  if (id < IDS[0] || id > IDS[1]) return next(new Error(`Out of range (${IDS[0]}-${IDS[1]}): ${id}`));
  return next();
};

GPIO.prototype._exportId = function exportId(id, next) {
  this._checkId(id, (err) => {
    if (err) return next(err);
    this._update(id, {});
    fs.writeFile(path.resolve(GPIO_PATH, 'export'), id, next);
  });
};

GPIO.prototype._unexportId = function unexportId(id, next) {
  this._checkId(id, (err) => {
    if (err) return next(err);
    delete currentIds[id];
    fs.writeFile(path.resolve(GPIO_PATH, 'unexport'), id, next);
  });
};

GPIO.prototype._exported = function exported(id, next) {
  this._checkId(id, (err) => {
    if (err) return next(err);
    fs.stat(path.resolve(GPIO_PATH, 'gpio' + id), (err, stat) => {
      return next(!err && stat);
    });
  });
};

GPIO.prototype._write = function write(id, bit, next) {
  this._exported(id, (value) => {
    if (value !== true)
      return next(new Error('Not exported: ' + id));
    if (bit !== UP && bit !== DOWN)
      return next(new Error(`Wrong value (${UP}/${DOWN}): ${bit}`));
    fs.writeFile(path.resolve(GPIO_PATH, 'gpio' + id, 'value'), bit, next);
  });
};

/**
 * direction - set direction for the gpio id
 *
 * @param  {integer}  id    gpio id
 * @param  {string}   dir   in/out
 * @param  {function} next  callback
 */
GPIO.prototype._direction = function direction(id, direction, next) {
  this._exported(id, (value) => {
    if (value !== true)
      return next(new Error('Not exported: ' + id));
    if (direction !== IN && direction !== OUT)
      return next(new Error(`Wrong direction (${IN}/${OUT}): ${direction}`));
    this._update(id, { direction });
    fs.writeFile(path.resolve(GPIO_PATH, 'gpio' + id, 'direction'), direction, next);
  });
};


/**
 * edge - set edge option for the gpio id
 *
 * @param  {integer}  id    gpio id
 * @param  {string}   edge  none/rising/falling/both
 * @param  {function} next  callback
 */
GPIO.prototype._edge = function edge(id, edge, next) {
  this._exported(id, (value) => {
    if (value !== true)
      return next(new Error('Not exported: ' + id));
    if (edge !== EDGE.none && edge !== EDGE.rising && edge !== EDGE.falling && edge !== EDGE.both)
      return next(new Error(`Wrong edge (${EDGE.none}/${EDGE.rising}/${EDGE.falling}/${EDGE.both}): ${edge}`));
    this._update(id, { edge });
    fs.writeFile(path.resolve(GPIO_PATH, 'gpio' + id, 'edge'), edge, next);
  });
};

GPIO.prototype._update = function update(id, data) {
  currentIds[id] = Object.assign(currentIds[id] || {}, data);
};
