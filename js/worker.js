var origImg;
var origCvs;
var origContext;
var origImgData;
var origImgPixels;

self.addEventListener('message', function(e) {	
	var data = e.data;
	switch (data.cmd) {
	  case 'start': DoTheJob(); break;
	};
  }, false);

  function DoTheJob() {
		if (origImg != null) {

	// build reference image data
		origImg = document.getElementById('refImg');
		origCvs = document.createElement('canvas');
		origCvs.width = origImg.width;
		origCvs.height = origImg.height;
		origContext = origCvs.getContext('2d');
		origContext.drawImage(origImg,0,0,origImg.width,origImg.height);
		origImgData = origContext.getImageData(0, 0, origImg.width, origImg.height);
		origImgPixels = origImgData.data;
		  
		// build out  image data
		var outCvs = document.getElementById('outImg');
		outCvs.width = origImg.width;
		outCvs.height = origImg.height;
		var outContext = outCvs.getContext("2d");
        var outImageData = outContext.getImageData(0, 0, origImg.width, origImg.height);
        var outPixels = outImageData.data;


		var outCvs2 = document.getElementById('outImg2');
		outCvs2.width = origImg.width;
		outCvs2.height = 1;
		var outContext2 = outCvs2.getContext("2d");
        var outImageData2 = outContext2.getImageData(0, 0, origImg.width, 1);
		var outPixels2 = outImageData2.data;
		
	// options with defaults (not required)
	var opts = {
		colors: 8,             // desired palette size
		method: 2,               // histogram method, 2: min-population threshold within subregions; 1: global top-population
		boxSize: [320,1],        // subregion dims (if method = 2)
		boxPxls: 2,              // min-population threshold (if method = 2)
		initColors: 4096,        // # of top-occurring colors  to start with (if method = 1)
		minHueCols: 0,           // # of colors per hue group to evaluate regardless of counts, to retain low-count hues
		dithKern: null,          // dithering kernel name, see available kernels in docs below
		dithDelta: 0,            // dithering threshhold (0-1) e.g: 0.05 will not dither colors with <= 5% difference
		dithSerp: false,         // enable serpentine pattern dithering
		palette: [],             // a predefined palette to start with in r,g,b tuple format: [[r,g,b],[r,g,b]...]
		reIndex: false,          // affects predefined palettes only. if true, allows compacting of sparsed palette once target palette size is reached. also enables palette sorting.
		useCache: true,          // enables caching for perf usually, but can reduce perf in some cases, like pre-def palettes
		cacheFreq: 10,           // min color occurance count needed to qualify for caching
		colorDist: "euclidean",  // method used to determine color distance, can also be "manhattan"
	};

	opts.colors = parseInt(document.getElementById("targetColorCount").value,10);
	opts.method = 2;
	opts.boxSize = [origImg.width,1];
	opts.initColors = 32;
	for (var y = 0; y < origImg.height; y++) {
			var write = 0;
			var read = y*origImg.width*4;
			for (var x = 0; x < origImg.width; x++) {
				outPixels2[write++] = origImgPixels[read++];
				outPixels2[write++] = origImgPixels[read++];
				outPixels2[write++] = origImgPixels[read++];
				outPixels2[write++] = origImgPixels[read++];
			}
			outImageData2.data = outPixels2;
			outContext2.putImageData(outImageData2,0, 0);

			var q = new RgbQuant(opts);
			// analyze histograms
			q.sample(origCvs);

			// build palette
			var pal = q.palette();

			// reduce images
			var outA = q.reduce(origCvs);

			var read = 0;
			var write = y*origImg.width*4;
			for (var x = 0; x < origImg.width; x++) {
				outPixels[write++] = outA[read++];
				outPixels[write++] = outA[read++];
				outPixels[write++] = outA[read++];
				outPixels[write++] = outA[read++];
			}
			postMessage(y);
		}
		outImageData.data = outPixels;
		outContext.putImageData(outImageData, 0, 0);
		self.close();
	}


/*	
	var idxi32 = new Uint32Array(outA.buffer);
	
	if (typeOf(outImageData) == "CanvasPixelArray") {
		var data = outImageData;
		for (var i = 0, len = data.length; i < len; ++i)
			data[i] = outA[i];
	}
	else {
		var buf32 = new Uint32Array(outImageData.data.buffer);
		buf32.set(idxi32);
	}

	outContext.putImageData(outImageData, 0, 0);
	*/
  }
 
