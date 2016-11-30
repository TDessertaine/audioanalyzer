 // check if AudioContext is supported be the current browser
 if (!window.AudioContext) {
     if (!window.webkitAudioContex) {
         alert("no audiocontext found");
     }
     window.AudioContext = window.webkitAudioContext;
 }
 var Audiodata = {
     blockLen: 1024,
     signalLen: undefined,
     sampleRate: undefined,
     samples: undefined,
     numOfChannels: undefined,
     nPart: undefined,
     hopsize: undefined,
     overlap: 1 / 2,
     spectrogram: undefined,
     phase: undefined,
     groupDelay: undefined,
     instantFreq: undefined,
     windowFunction: undefined,
     cepstrum: undefined,
     modSpec: undefined,
     display: "Spectrum"
 };

 enableButton();

 // define global audioContext
 var reader = new FileReader();
 var audioCtx = new AudioContext();
 //Loading message

 // function triggered by loading a Audiodata
 function audioProcessing() {
     document.getElementById("loading").style.display = "block";
     document.getElementById("container").style.display = "block"
     // get the first file data with the id "myAudio"
     var data = document.getElementById("myAudio").files[0];

     // read the data from myAudio as ArrayBuffer
     reader.readAsArrayBuffer(data);

     // save sampleRate as globalobject variable
     Audiodata.sampleRate = audioCtx.sampleRate;

     // trigger the onload function to decode the Audiodata
     reader.onload = function() {
         audioCtx.decodeAudioData(reader.result).then(buffer => {

             myArrayBuffer = buffer;

             Audiodata.numOfChannels = buffer.numberOfChannels;

             Audiodata.hopsize = Audiodata.blockLen - (Audiodata.blockLen * Audiodata.overlap);

             Audiodata.samples = buffer.getChannelData(0);

             Audiodata.signalLen = Audiodata.samples.length;

             Audiodata.nPart = Math.round((Audiodata.signalLen - Audiodata.blockLen) / Audiodata.hopsize);

             Audiodata.spectrogram = new Array(Audiodata.nPart);
             Audiodata.phase = new Array(Audiodata.nPart);
             Audiodata.cepstrum = new Array(Audiodata.nPart);
             Audiodata.groupDelay = new Array(Audiodata.nPart);
             Audiodata.modSpec = new Array(Audiodata.nPart);

             calculateDisplay(window, Audiodata.display);

             drawSpec();

             drawWave();
         document.getElementById("loading").style.display = "none";
         document.getElementById("container").style.display = "none";
         });
     };
 }

 function calculateDisplay(window, type) {

     // create array with zeros for imaginär part to use the fft
     var zeros = new Array(Audiodata.blockLen);

     var windowLen = linspace(0, Audiodata.blockLen, Audiodata.blockLen);

     window = calculateWindow(windowLen, Audiodata.windowFunction);
     var endIdx = 0;

     for (var i = 0; i < Audiodata.nPart; i++) {

         var realPart = Audiodata.samples.slice(Audiodata.hopsize * i,
             Audiodata.blockLen + endIdx);
         var imagPart = zeros.fill(0);

         for (var k = 0; k < Audiodata.blockLen; k++) {
             realPart[k] = realPart[k] * window[k];
         }

         transform(realPart, imagPart);

         switch (type) {
             case "Spectrum":
                 Audiodata.spectrogram[i] = calculateAbs(realPart, imagPart);
                 break;
             case "Phase":
                 Audiodata.phase[i] = calculatePhase(realPart, imagPart);
                 break;
             case "MFCC":
                 Audiodata.cepstrum[i] = calculateMFCC(realPart, imagPart);
                 break;
             case "Modulation Spectrum":
                 Audiodata.modSpec[i] = calculateModSpec(realPart, imagPart);
                 break;
             case "Group Delay":
                 Audiodata.groupDelay[i] = calculateGroupDelay(realPart, imagPart);
                 break;
             case "Instantaneous Frequency":
                 Audiodata.instantFreq = calculateInstantFreq(realPart, imagPart);
                 break;
             default:
                 Audiodata.spectrogram[i] = calculateAbs(realPart, imagPart);
                 break;
         }
         endIdx = endIdx + Audiodata.hopsize;
     }
 }

 // Cosine - transform needed to calculate the MFCC's so we deferred it
 function calculateMFCC(real, imag) {

     var absValue = calculateAbs(real, imag);
     var melFreq = new Array(absValue.length);

     melFreq = calculateMelFreq(absValue);

     var completeReal = new Array(Audiodata.blockLen);
     var completeImag = new Array(Audiodata.blockLen).fill(0);

     for (var k = 0; k < Audiodata.blockLen / 2; k++) {

         var logAbsValue = Math.log10(absValue[k] * absValue[k]);
         completeReal[k] = logAbsValue;
         completeReal[(Audiodata.blockLen - 1) - k] = logAbsValue;
     }

     inverseTransform(completeReal, completeImag);

     for (var i = 0; i < completeReal.length; i++) {
         completeReal[i] = Math.abs(completeReal[i]);
         completeReal[i] = completeReal[i] * completeReal[i];
     }
     return completeReal;
 }

 function calculateMelFreq(freq) {

     var mel = new Array(freq.length);

     for (var i = 0; i < freq.length; i++) {
         mel[i] = 1127 * Math.log(1 + (freq[i] / (700 / (Audiodata.sampleRate / 2))));
     }
     return mel;
 }

 function calculateGroupDelay(real, imag) {

     var phase = calculatePhase(real, imag);

     var freqVector = linspace(0, Audiodata.sampleRate / 2, Audiodata.blockLen / 2);

     var dOmega = (freqVector[2] - freqVector[1]) * 2 * Math.PI;

     var dPhase = diff(phase);

     var groupDelay = new Array(dPhase.length);

     for (var k = 0; k < dPhase.length; k++) {
         if (dPhase[k] > Math.PI) {
             dPhase[k] = dPhase[k] - 2 * Math.PI;
         } else if (dPhase[k] < (-1 * Math.PI)) {
             dPhase[k] = dPhase[k] + 2 * Math.PI;
         }
         groupDelay[k] = -1 * dPhase[k] / dOmega;
     }
     return groupDelay;
 }

 function calculateInstantFreq(real, imag) {

     var analyticWeight = new Array(real.length).fill(0);
     analyticWeight[0] = 1;
     analyticWeight[Audiodata.blockLen / 2 - 1] = 1;

     for (var i = 1; i < Audiodata.blockLen / 2 - 1; i++) {
         analyticWeight[i] = 2;
     }

     analyticImag = new Array(imag.length).fill(0);
     analyticReal = new Array(real.length).fill(0);

     for (var k = 0; k < real.length; k++) {
         analyticReal[k] = real[k] * analyticWeight[k];
     }

     inverseTransform(analyticReal, analyticImag);

     var phase = calculatePhase(analyticReal, analyticImag);

     var time = Math.round(Audiodata.signalLen / Audiodata.sampleRate);

     var timeVector = linspace(0, time, phase.length);

     var dTime = (timeVector[2] - timeVector[1]);

     var dPhase = diff(phase);

     var instantFreq = new Array(dPhase.length + 1).fill(0);

     for (var k = 1; k < dPhase.length; k++) {
         instantFreq[k] = (1 / 2 * Math.PI) * dPhase[k] / dTime;
     }
     return instantFreq;
 }

 function calculateModSpec(real, imag) {

     var analyticWeight = new Array(real.length).fill(0);
     analyticWeight[0] = 1;
     analyticWeight[Audiodata.blockLen / 2 - 1] = 1;

     for (var i = 1; i < Audiodata.blockLen / 2 - 1; i++) {
         analyticWeight[i] = 2;
     }

     analyticImag = new Array(imag.length).fill(0);
     analyticReal = new Array(real.length).fill(0);

     for (var k = 0; k < real.length; k++) {
         analyticReal[k] = real[k] * analyticWeight[k];
     }

     inverseTransform(analyticReal, analyticImag);

     var envelopeReal = calculateAbs(analyticReal, analyticImag);

     var envelopeImag = new Array(envelopeReal.length).fill(0);

     transform(envelopeReal, envelopeImag);

     var modSpec = calculateAbs(envelopeReal, envelopeImag);

     for (var l = 0; l < modSpec.length; l++) {
         modSpec[l] = modSpec[l] / (2 * Math.PI);
     }

     return modSpec;
 }

 function calculateAbs(real, imag) {

     var absValue = new Array(Audiodata.blockLen / 2 + 1);

     for (i = 0; i < absValue.length; i++) {
         absValue[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
     }
     return absValue;
 }

 function calculatePhase(real, imag) {

     var phaseValue = new Array(Audiodata.blockLen / 2 + 1);

     for (i = 0; i < phaseValue.length; i++) {
         phaseValue[i] = Math.atan2(real[i], imag[i]);
     }
     return phaseValue;
 }

 function calculateWindow(windowLen, type) {
     var window = new Array(windowLen.length);
     switch (type) {
         case "hann":
             for (i = 0; i < windowLen.length; i++) {
                 window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * windowLen[i] / (windowLen.length - 1)));
             }
             break;
         case "hannpoisson":
             // α is a parameter that controls the slope of the exponential (wiki)
             var alpha = 2;

             for (i = 0; i < windowLen.length; i++) {
                 window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * windowLen[i] / (windowLen.length - 1))) *
                     Math.exp((-alpha * Math.abs(windowLen.length - 1 - (2 * windowLen[i]))) / (windowLen.length - 1));
             }
             break;
         case "cosine":
             for (i = 0; i < windowLen.length; i++) {
                 window[i] = Math.cos(((Math.PI * windowLen[i]) / (windowLen.length)) - (Math.PI / 2));
             }
             break;
         default:
             window.fill(1);
             break;
     }
     return window;
 }

 function linspace(startIdx, endIdx, n) {

     var linVector = new Array(n);

     for (var i = 0; i < n; i++) {
         linVector[i] = startIdx + (i * (endIdx - startIdx) / n);
     }
     linVector[0] = startIdx;
     linVector[n - 1] = endIdx;
     return linVector;
 }

 function diff(array) {

     var difference = new Array(array.length - 1);

     for (var i = 0; i < difference.length; i++) {
         difference[i] = array[i + 1] - array[i];
     }
     return difference;
 }
