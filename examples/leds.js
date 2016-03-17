'use strict';

const Pin = require('../lib/pin');


const leds = [
  new Pin(4),
  new Pin(17),
  new Pin(27),
  new Pin(22),
  new Pin(5),
  new Pin(6),
  new Pin(13),
  new Pin(19)
];
const pIn = new Pin(26);
var i = 0;

pIn.listen((value) => {
  console.log('NEW VALUE = ' + value);
});

leds.forEach((led) => { led.up(); });

setTimeout(() => {
  leds.forEach((led) => { led.down(); });
  setInterval(() => {
    if (i > 7) {
      i = 0;
      leds[7].down();
    }
    let led = leds[i];
    led.up();
    if (i > 0) leds[i-1].down();
    i++;
  }, 500);
}, 1000);
