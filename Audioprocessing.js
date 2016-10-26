 // check if AudioContext is supported be the current browser
if (!window.AudioContext) {
    if (!window.webkitAudioContex) {
        alert("no audiocontext found");
    }
    window.AudioContext = window.webkitAudioContext;
}

var Audiodata = {blockLen:undefined, signalLen:undefined, sampleRate:undefined, channels:undefined,
                hopsize:undefined, spectrogram:undefined, samples:undefined};

// function triggered by loading a Audiodata
function loadAudio() {

    // define objects
    var reader = new FileReader();
    var audioCtx = new AudioContext();

    // get the first file data with the id "myAudio"
    var data = document.getElementById("myAudio").files[0];

    // read the data from myAudio as ArrayBuffer
    reader.readAsArrayBuffer(data);

    Audiodata.sampleRate = audioCtx.sampleRate;

    // trigger the onload function to decode the Audiodata
    reader.onload = function() {
        audioCtx.decodeAudioData(reader.result).then(buffer => {
            // give the decoded Audiodata to the split-function
            CalculateSpec(buffer);
            console.log(Audiodata.spectrogram);
        });
    };

    function CalculateSpec(buffer) {
        // define the block length :: later blockLen as user input
        Audiodata.blockLen = 2048;
        // define hopsize 25% of blockLen
        Audiodata.hopsize = Audiodata.blockLen / 4;

        Audiodata.samples = buffer.getChannelData(0);

        Audiodata.signalLen = Audiodata.samples.length;

        // calculate the startpoints for the sample blocks
        var nPart = Math.floor((Audiodata.signalLen - Audiodata.blockLen) / Audiodata.hopsize);
        // create array with zeros for imaginär part to use the fft
        var zeros = new Array(Audiodata.blockLen).fill(0);

        var endIdx = 0;

        Audiodata.spectrogram = new Array(nPart);

        for (var i = 0; i < nPart; i++) {

            var real = Audiodata.samples.slice(Audiodata.hopsize * i,
                        Audiodata.blockLen + endIdx);

            var imag = zeros.fill(0);

            endIdx = endIdx + Audiodata.hopsize;

            CalculateFFT(real, imag);

            Audiodata.spectrogram[i] = CalculateFFTabsValue(real, imag);

        }
    }

    function CalculateFFT(real, imag) {
        transform(real, imag);
    }

    function CalculateFFTabsValue(real, imag) {

        var absValue = new Array(real.length/2+1);

        for (i = 0; i < absValue.length; i++) {
            absValue[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }
        return absValue;
    }
}
