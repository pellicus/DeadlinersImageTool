  function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.

	var img = document.getElementById('refImg');
	img.file = files[0];
	var reader = new FileReader();
    reader.onload = (function (aImg) { return function (e) { 
        aImg.src = e.target.result;
        setTimeout(onImageDropped, 500);
	}; })(img);
    reader.readAsDataURL(files[0]);	
	
  }

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }
