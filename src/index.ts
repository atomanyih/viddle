import startAnimationLoop from "./startAnimationLoop";
import Stats from 'stats-js';
import * as waves from "./Waves";

import * as dat from 'dat.gui';
import {freqFromParams} from "./freqFromParams";
import {OscillatorParameters, oscParameterDefinitions} from "./Parameters";
import {getPast, saveImageData} from "./ThePast";

const trailsParameters = {
  trailsAmount: 0
};

const gui = new dat.GUI({name: 'hello'});

gui.add(trailsParameters, 'trailsAmount', 0, 1);

const createOscFolder : (name:string) => OscillatorParameters = name => {
  const oscFolder = gui.addFolder(name);
  const oscParameters = Object.entries(oscParameterDefinitions).reduce((acc, [paramName, paramDef]) => {
    return {
      ...acc,
      [paramName]: paramDef.init
    };
  }, {});

  Object.entries(oscParameterDefinitions).forEach(([paramName, paramDef]) => {
    oscParameters[paramName] = paramDef.init;
    if(paramDef.options) { // type this better
      oscFolder.add(oscParameters, paramName, paramDef.options)
    } else {
      oscFolder.add(oscParameters, paramName, paramDef.min, paramDef.max)
    }
  });

  // is this sketch?
  return <OscillatorParameters> oscParameters
};

const osc1Parameters : OscillatorParameters = createOscFolder('osc1');
const osc2Parameters : OscillatorParameters = createOscFolder('osc2');
const osc3Parameters : OscillatorParameters = createOscFolder('osc3');


const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);


const canvas = <HTMLCanvasElement>document.getElementById('canvas');
const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// eventually do transforms... but HOW? shader?
// create scaling thing
//

const blend = (a, b, amount) => {
  // return a + b * amount - amount * 255 // plus darker
  return a + b * amount // plus lighter
  // return a - b * amount;
  // return (Math.random() > amount) ? a : b
};

const blendPixel = ([r0,g0,b0], [r1,g1,b1], amount) => {
  // return [
  //   r0 + r1 * amount,
  //   g0 + g1 * amount,
  //   b0 + b1 * amount,
  // ]
  return [
    r0 + r1 * amount,
    g0 + g1 * amount,
    b0 + b1 * amount,
  ]
};

// const blendPixel = (a, b, amount) => {
//   if (amount == 0) {
//     return a
//   }
//   return Math.random() > amount ? a : b
// };

const cancel = startAnimationLoop((t) => {
  stats.begin();

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const imageData = ctx.createImageData(canvasWidth, canvasHeight);

  const data = imageData.data;

  const {trailsAmount} = trailsParameters;

  const osc1Freq = freqFromParams(osc1Parameters.freqExp, osc1Parameters.freqFine);
  const osc2Freq = freqFromParams(osc2Parameters.freqExp, osc2Parameters.freqFine);
  const osc3Freq = freqFromParams(osc3Parameters.freqExp, osc3Parameters.freqFine);

  const timePerFrame = 1000/60;
  const timePerPixel = timePerFrame/data.length;

  const currentPixel = Math.floor(t / timePerPixel) % data.length;

  const osc1Wave = waves[osc1Parameters.waveName];
  const osc2Wave = waves[osc2Parameters.waveName];
  const osc3Wave = waves[osc3Parameters.waveName];

  for (let i = 0; i < data.length; i += 4) {
    // if(i / 4 == currentPixel) {
    //   data[i] = 255;
    //   data[i + 1] =255;
    //   data[i + 2] = 255;
    //   data[i + 3] = 255
    // }
    const adjustedT = t + (i - currentPixel) * timePerPixel;

    const osc1Val = osc1Wave(
      osc1Freq,
      getPast(i + 2) / 255 * osc1Parameters.mod,
      adjustedT
    );
    const osc2Val = osc2Wave(
      osc2Freq,
      osc1Val * osc2Parameters.mod,
      adjustedT
    );

    const osc3Val = osc3Wave(
      osc3Freq,
      osc2Val * osc3Parameters.mod,
      adjustedT
    );

    const pixel = blendPixel(
      [(osc1Val + 1) / 2 * 255 * osc1Parameters.mix, (osc2Val + 1) / 2 * 255 * osc2Parameters.mix, (osc3Val + 1) / 2 * 255 * osc3Parameters.mix],
      [getPast(i), getPast(i+1), getPast(i+2)],
      trailsAmount
    );

    data[i] = pixel[0];
    data[i + 1] = pixel[1];
    data[i + 2] = pixel[2];
    data[i + 3] = 255
  }

  saveImageData(imageData);

  ctx.putImageData(imageData, 0, 0);

  stats.end();
});

if (module.hot) {
  module.hot.dispose(function () {
    console.log('cancelling animation frame');
    cancel();
    console.log('removing stats node');
    document.body.removeChild(stats.dom);
    console.log('removing dat');
    gui.destroy();
  })
}